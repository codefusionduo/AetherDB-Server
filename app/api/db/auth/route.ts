import { NextRequest, NextResponse } from 'next/server';
import { getBaasEngine } from '@/lib/db-server/server-state';

export const dynamic = 'force-dynamic';

function cleanSender(rawInput: string | undefined, defaultName: string = 'AetherDB'): string {
  if (!rawInput) return 'AetherDB <auth@aetherdb.ryzn.pro>';
  const str = rawInput.trim().replace(/^["']+|["']+$/g, '').trim();
  const emailMatch = str.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (!emailMatch) {
    return 'AetherDB <auth@aetherdb.ryzn.pro>';
  }
  const cleanEmail = emailMatch[1].trim();
  let displayName = defaultName.trim().replace(/^["']+|["']+$/g, '').trim();
  const namePartMatch = str.match(/^(.*?)\s*<.*>$/);
  if (namePartMatch && namePartMatch[1].trim()) {
    const candidateName = namePartMatch[1].replace(/^[<"']+|[>"']+$/g, '').trim();
    if (candidateName) {
      displayName = candidateName;
    }
  }
  return `${displayName} <${cleanEmail}>`;
}

export async function GET() {
  try {
    const baas = getBaasEngine();
    const users = baas.getAuthUsers();
    const policies = baas.getRlsPolicies();
    const emailOutbox = baas.getEmailOutbox();
    const emailConfig = baas.getEmailConfig();
    return NextResponse.json({ success: true, users, policies, emailOutbox, emailConfig });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, role, provider, id, policy, clientOrigin } = body;
    const baas = getBaasEngine();

    if (action === 'create_user') {
      if (!email) {
        return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 });
      }
      const user = baas.createAuthUser(email, role || 'authenticated', provider || 'email');
      return NextResponse.json({ success: true, user });
    }

    if (action === 'request_magic_link') {
      if (!email) {
        return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
      }
      const { user, token, code, mailId } = baas.requestMagicLink(email);
      
      const requestOrigin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || (req.nextUrl.origin !== 'null' ? req.nextUrl.origin : '');
      const origin = clientOrigin || process.env.APP_URL || requestOrigin || 'https://aetherdb.ryzn.pro';
      const activationUrl = `${origin}/?activationToken=${token}&email=${encodeURIComponent(email)}`;
      const config = baas.getEmailConfig();
      const resendKey = process.env.RESEND_API_KEY || config.resendApiKey;

      let resendDelivery = null;
      if (resendKey) {
        const htmlBody = config.htmlTemplate
          .replace(/{{activation_url}}/g, activationUrl)
          .replace(/{{otp_code}}/g, code)
          .replace(/{{user_email}}/g, email);

        const primaryFrom = cleanSender(process.env.RESEND_FROM || config.senderEmail, config.senderName || 'AetherDB');

        try {
          let resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: primaryFrom,
              to: [email],
              subject: '🔒 Activate Your AetherDB Account - Magic Login Link',
              html: htmlBody
            })
          });

          let resendData = await resendRes.json();

          // Fallback to onboarding@resend.dev if custom domain is not yet verified in Resend
          if (!resendRes.ok && !primaryFrom.includes('onboarding@resend.dev')) {
            console.log('First Resend attempt failed:', resendData?.message, 'Retrying with onboarding@resend.dev');
            resendRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: 'AetherDB <onboarding@resend.dev>',
                to: [email],
                subject: '🔒 Activate Your AetherDB Account - Magic Login Link',
                html: htmlBody
              })
            });
            resendData = await resendRes.json();
          }

          if (resendRes.ok && resendData.id) {
            baas.updateOutboxLogStatus(mailId, 'DELIVERED', resendData.id);
            resendDelivery = { status: 'DELIVERED', resendId: resendData.id };
          } else {
            const errMsg = resendData.message || JSON.stringify(resendData);
            baas.updateOutboxLogStatus(mailId, 'FAILED', undefined, errMsg);
            resendDelivery = { status: 'FAILED', error: errMsg };
          }
        } catch (err: any) {
          baas.updateOutboxLogStatus(mailId, 'FAILED', undefined, err.message);
          resendDelivery = { status: 'FAILED', error: err.message };
        }
      }

      return NextResponse.json({
        success: true,
        user,
        token,
        code,
        mailId,
        resendDelivery,
        message: `Magic activation link dispatched to ${email}`
      });
    }

    if (action === 'verify_magic_link') {
      const { token, code } = body;
      const verifyInput = token || code;
      if (!email || !verifyInput) {
        return NextResponse.json({ success: false, error: 'Email and token/code required' }, { status: 400 });
      }
      const res = baas.verifyMagicLink(email, verifyInput);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        user: res.user,
        token: res.token,
        message: 'Account activated & logged in successfully!'
      });
    }

    if (action === 'check_status') {
      if (!email) {
        return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 });
      }
      const users = baas.getAuthUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (user && user.status === 'ACTIVE') {
        return NextResponse.json({ success: true, activated: true, user, token: `session_${user.id}` });
      }
      return NextResponse.json({ success: true, activated: false });
    }

    if (action === 'toggle_status') {
      if (!id) {
        return NextResponse.json({ success: false, error: 'User id required' }, { status: 400 });
      }
      const updated = baas.toggleAuthUserStatus(id);
      return NextResponse.json({ success: true, user: updated });
    }

    if (action === 'generate_token') {
      if (!id) {
        return NextResponse.json({ success: false, error: 'User id required' }, { status: 400 });
      }
      const users = baas.getAuthUsers();
      const user = users.find(u => u.id === id);
      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }
      const token = baas.generateJwtToken(user);
      return NextResponse.json({ success: true, token, user });
    }

    if (action === 'create_policy') {
      if (!policy || !policy.name || !policy.target) {
        return NextResponse.json({ success: false, error: 'Valid policy payload required' }, { status: 400 });
      }
      const newPolicy = baas.addRlsPolicy(policy);
      return NextResponse.json({ success: true, policy: newPolicy });
    }

    if (action === 'toggle_policy') {
      if (!id) {
        return NextResponse.json({ success: false, error: 'Policy id required' }, { status: 400 });
      }
      const ok = baas.toggleRlsPolicy(id);
      return NextResponse.json({ success: ok });
    }

    if (action === 'update_email_config') {
      const { config } = body;
      const updated = baas.updateEmailConfig(config || {});
      return NextResponse.json({ success: true, emailConfig: updated });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'user';
    const id = searchParams.get('id');
    const baas = getBaasEngine();

    if (!id) {
      return NextResponse.json({ success: false, error: 'id parameter required' }, { status: 400 });
    }

    if (type === 'policy') {
      const ok = baas.deleteRlsPolicy(id);
      return NextResponse.json({ success: ok, message: 'Policy deleted' });
    }

    const ok = baas.deleteAuthUser(id);
    return NextResponse.json({ success: ok, message: 'User deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

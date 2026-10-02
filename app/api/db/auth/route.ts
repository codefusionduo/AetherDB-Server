import { NextRequest, NextResponse } from 'next/server';
import { getBaasEngine } from '@/lib/db-server/server-state';

export async function GET() {
  try {
    const baas = getBaasEngine();
    const users = baas.getAuthUsers();
    const policies = baas.getRlsPolicies();
    return NextResponse.json({ success: true, users, policies });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, role, provider, id, policy } = body;
    const baas = getBaasEngine();

    if (action === 'create_user') {
      if (!email) {
        return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 });
      }
      const user = baas.createAuthUser(email, role || 'authenticated', provider || 'email');
      return NextResponse.json({ success: true, user });
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

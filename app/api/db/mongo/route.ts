import { NextRequest, NextResponse } from 'next/server';
import { getBaasEngine, logQuery } from '@/lib/db-server/server-state';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const collection = searchParams.get('collection');
    const baas = getBaasEngine();

    if (!collection) {
      // List all collections
      const collections = baas.getCollections();
      return NextResponse.json({ success: true, collections });
    }

    // Get documents in collection
    const filterParam = searchParams.get('filter');
    let filterObj = {};
    if (filterParam) {
      try {
        filterObj = JSON.parse(filterParam);
      } catch {
        // Ignore invalid filter
      }
    }

    const documents = baas.findDocuments(collection, filterObj);
    return NextResponse.json({
      success: true,
      collection,
      documents,
      count: documents.length
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'insert', collection, document, filter = {}, name } = body;
    const baas = getBaasEngine();

    if (action === 'create_collection') {
      if (!name) {
        return NextResponse.json({ success: false, error: 'Collection name required' }, { status: 400 });
      }
      const ok = baas.createCollection(name);
      if (!ok) {
        return NextResponse.json({ success: false, error: `Collection '${name}' already exists` }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: `Collection '${name}' created` });
    }

    if (action === 'insert') {
      if (!collection || !document) {
        return NextResponse.json({ success: false, error: 'Collection and document required' }, { status: 400 });
      }
      const inserted = baas.insertDocument(collection, document);
      logQuery({
        timestamp: new Date().toLocaleTimeString(),
        database: 'aetherdoc:nosql',
        sql: `doc.${collection}.insertOne(${JSON.stringify(document)})`,
        executionTimeMs: 0.9,
        rowsAffected: 1,
        status: 'SUCCESS',
        clientIp: req.headers.get('x-forwarded-for') || '127.0.0.1:rest'
      });
      return NextResponse.json({ success: true, document: inserted });
    }

    if (action === 'find') {
      if (!collection) {
        return NextResponse.json({ success: false, error: 'Collection required' }, { status: 400 });
      }
      const docs = baas.findDocuments(collection, filter);
      return NextResponse.json({ success: true, documents: docs, count: docs.length });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { collection, id, updates } = body;
    if (!collection || !id || !updates) {
      return NextResponse.json({ success: false, error: 'Collection, id and updates required' }, { status: 400 });
    }

    const baas = getBaasEngine();
    const ok = baas.updateDocument(collection, id, updates);
    if (!ok) {
      return NextResponse.json({ success: false, error: `Document with _id '${id}' not found` }, { status: 404 });
    }

    logQuery({
      timestamp: new Date().toLocaleTimeString(),
      database: 'aetherdoc:nosql',
      sql: `doc.${collection}.updateOne({ _id: '${id}' }, { $set: ${JSON.stringify(updates)} })`,
      executionTimeMs: 1.1,
      rowsAffected: 1,
      status: 'SUCCESS',
      clientIp: req.headers.get('x-forwarded-for') || '127.0.0.1:rest'
    });

    return NextResponse.json({ success: true, message: 'Document updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const collection = searchParams.get('collection');
    const id = searchParams.get('id');
    const drop = searchParams.get('drop') === 'true';
    const baas = getBaasEngine();

    if (!collection) {
      return NextResponse.json({ success: false, error: 'Collection required' }, { status: 400 });
    }

    if (drop) {
      const ok = baas.dropCollection(collection);
      if (!ok) {
        return NextResponse.json({ success: false, error: `Collection '${collection}' not found` }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: `Collection '${collection}' dropped` });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Document id required' }, { status: 400 });
    }

    const ok = baas.deleteDocument(collection, id);
    if (!ok) {
      return NextResponse.json({ success: false, error: `Document with _id '${id}' not found` }, { status: 404 });
    }

    logQuery({
      timestamp: new Date().toLocaleTimeString(),
      database: 'aetherdoc:nosql',
      sql: `doc.${collection}.deleteOne({ _id: '${id}' })`,
      executionTimeMs: 0.8,
      rowsAffected: 1,
      status: 'SUCCESS',
      clientIp: req.headers.get('x-forwarded-for') || '127.0.0.1:rest'
    });

    return NextResponse.json({ success: true, message: 'Document deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

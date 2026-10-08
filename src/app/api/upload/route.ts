import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const guestName = (formData.get('guestName') as string) || 'Invitado';
    const message = (formData.get('message') as string) || '';

    const uploadedUrls = [];

    for (const file of files) {
      // Limpiamos los textos para que no rompan la URL
      const safeName = guestName.replace(/[^a-zA-Z0-9]/g, '_');
      const safeMsg = message.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${Date.now()}---${safeName}---${safeMsg}---${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;

      const { data, error } = await supabase.storage
        .from('fotos')
        .upload(fileName, file, { cacheControl: '3600' });

      if (!error && data) uploadedUrls.push(fileName);
    }

    return NextResponse.json({ success: true, uploaded: uploadedUrls.length });
  } catch (error) {
    return NextResponse.json({ error: 'Error al subir fotos' }, { status: 500 });
  }
}
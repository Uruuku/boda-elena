import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase.storage.from('fotos').list();
    if (error || !data) return NextResponse.json([]);

    const photos = data
      .filter(file => file.name !== '.emptyFolderPlaceholder')
      .sort((a, b) => {
        // Obligamos a TypeScript a tratar las fechas como textos válidos (as string)
        const timeA = new Date(a.created_at as string).getTime() || 0;
        const timeB = new Date(b.created_at as string).getTime() || 0;
        return timeB - timeA;
      })
      .map(file => {
        const { data: publicData } = supabase.storage.from('fotos').getPublicUrl(file.name);
        return {
          url: publicData.publicUrl,
          pathname: file.name,
          uploadedAt: file.created_at as string,
        };
      });

    return NextResponse.json(photos);
  } catch (error) {
    return NextResponse.json([]);
  }
}

export async function DELETE(request: Request) {
  try {
    const { url, password } = await request.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const fileName = url.substring(url.lastIndexOf('/') + 1);
    await supabase.storage.from('fotos').remove([fileName]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al borrar' }, { status: 500 });
  }
}
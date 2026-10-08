import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Evita que Vercel congele esta página y muestre siempre 0 fotos
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) return NextResponse.json([]);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.storage.from('fotos').list();
    
    if (error || !data) return NextResponse.json([]);

    const photos = data
      .filter(file => file.name !== '.emptyFolderPlaceholder')
      .sort((a, b) => {
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
    const supabaseUrl = process.env.NEXT_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { url, password } = await request.json();
    
    // Comprobamos la contraseña
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }
    
    // Extraemos el nombre del archivo y limpiamos los caracteres raros (como %20 de los espacios)
    const fileName = decodeURIComponent(url.substring(url.lastIndexOf('/') + 1));
    
    const { error } = await supabase.storage.from('fotos').remove([fileName]);
    
    if (error) {
      console.error("Error al borrar en Supabase:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error fatal en el borrado:", error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
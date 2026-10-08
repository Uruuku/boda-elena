import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { BODA } from '@/config/boda';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    // 1. Inicializamos Supabase DENTRO de la función para usar las variables reales
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Faltan las variables de entorno reales en Vercel");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const guestName = (formData.get('guestName') as string) || 'Invitado';
    const message = (formData.get('message') as string) || '';

    const uploadedUrls = [];

    for (const file of files) {
      const safeName = guestName.replace(/[^a-zA-Z0-9]/g, '_');
      const safeMsg = message.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${Date.now()}---${safeName}---${safeMsg}---${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;

      const { data, error } = await supabase.storage
        .from('fotos')
        .upload(fileName, file, { cacheControl: '3600' });

      // Si falla, AHORA SÍ lanzamos un error para que la web te avise y Vercel lo registre
      if (error) {
        console.error("Error de Supabase:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (data) {
        const { data: publicData } = supabase.storage.from('fotos').getPublicUrl(fileName);
        uploadedUrls.push(publicData.publicUrl);
      }
    }

    if (uploadedUrls.length > 0 && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: `📸 Nuevas fotos de ${guestName} - Boda ${BODA.nombres}`,
        html: `
          <h2 style="color: #436445;">¡${guestName} acaba de subir ${uploadedUrls.length} foto(s)!</h2>
          ${message ? `<p><strong>Mensaje que ha dejado:</strong> "${message}"</p>` : ''}
          <p>Puedes verlas en el muro de la web, o directamente desde estos enlaces:</p>
          <ul>
            ${uploadedUrls.map((url, index) => `<li><a href="${url}">Ver foto ${index + 1}</a></li>`).join('')}
          </ul>
        `,
      };

      await transporter.sendMail(mailOptions);
    }

    return NextResponse.json({ success: true, uploaded: uploadedUrls.length });
  } catch (error) {
    console.error("Error catastrófico en la subida:", error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
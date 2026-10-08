import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { BODA } from '@/config/boda';

// Permite que la función tarde hasta 60 segundos (útil si suben varias fotos pesadas a la vez)
export const maxDuration = 60;

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

    // 1. Subir las fotos a Supabase
    for (const file of files) {
      const safeName = guestName.replace(/[^a-zA-Z0-9]/g, '_');
      const safeMsg = message.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${Date.now()}---${safeName}---${safeMsg}---${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;

      const { data, error } = await supabase.storage
        .from('fotos')
        .upload(fileName, file, { cacheControl: '3600' });

      if (!error && data) {
        // Obtenemos la URL pública para ponerla en el correo
        const { data: publicData } = supabase.storage.from('fotos').getPublicUrl(fileName);
        uploadedUrls.push(publicData.publicUrl);
      }
    }

    // 2. Enviar el correo de notificación
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
        to: process.env.EMAIL_USER, // Te lo envías a ti mismo o al correo de los novios
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
    console.error("Error completo en la subida:", error);
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
  }
}
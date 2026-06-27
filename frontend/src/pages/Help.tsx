import React from 'react';
import { Link } from 'react-router-dom';

const Section: React.FC<{ n: string; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6">
    <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
      <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-base shrink-0">{n}</span>
      {title}
    </h2>
    <div className="text-gray-700 leading-relaxed space-y-2 text-[17px]">{children}</div>
  </div>
);

const Help: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link to="/dashboard" className="text-blue-200 hover:text-white text-sm">← Volver al panel</Link>
          <h1 className="text-3xl font-extrabold mt-2">❓ Ayuda</h1>
          <p className="text-blue-200 mt-1">Todo explicado fácil, paso a paso.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">

        {/* VIDEO: lo más importante, primero y destacado */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 sm:p-6">
          <h2 className="text-xl font-bold text-amber-900 mb-2">🎥 Cómo poner un video (¡leé esto!)</h2>
          <p className="text-amber-900 text-[17px] leading-relaxed">
            Cuando subís un video a <strong>YouTube</strong> te pregunta la privacidad. Esto es lo más importante:
          </p>
          <ul className="mt-3 space-y-2 text-[17px]">
            <li>🔴 <strong>Privado</strong>: ❌ los alumnos <strong>NO lo pueden ver</strong> (verían "Video no disponible").</li>
            <li>🟡 <strong>Oculto / No listado</strong>: ✅ <strong>esta es la que tenés que usar.</strong> No aparece en las búsquedas, pero se ve dentro del campus.</li>
            <li>🟢 <strong>Público</strong>: se ve, pero cualquiera lo encuentra en YouTube.</li>
          </ul>
          <p className="mt-3 text-[17px] text-amber-900">
            <strong>Pasos:</strong> subí el video a YouTube como <strong>"Oculto / No listado"</strong> → tocá <strong>"Compartir"</strong> → <strong>"Copiar"</strong> el link →
            en tu campus, creá una clase de tipo <strong>"Video"</strong> y <strong>pegá el link</strong>. ¡Listo!
          </p>
        </div>

        <Section n="1" title="Cómo entrar">
          <p>Entrá a <strong>escuela-superior.vercel.app</strong>, tocá <strong>"Iniciar sesión"</strong>, poné tu correo y contraseña.</p>
          <p className="text-gray-500 text-[15px]">💡 La primera vez del día puede tardar ~30 segundos en despertar. Es normal.</p>
        </Section>

        <Section n="2" title="Crear un curso">
          <p>En tu panel tocá <strong>"Crear curso"</strong>. Poné nombre, descripción, categoría y precio (0 si es gratis). Tocá <strong>"Crear"</strong>.</p>
          <p>Después entrá al curso y tocá <strong>"Gestionar contenido"</strong> para cargar las clases.</p>
        </Section>

        <Section n="3" title="Agregar capítulos y clases">
          <p>En "Gestionar contenido": tocá <strong>"Nuevo módulo"</strong> (un capítulo) y después <strong>"Nueva clase"</strong>.</p>
          <p>En cada clase elegí el <strong>tipo</strong>: <strong>Video</strong> (link de YouTube), <strong>PDF</strong> (un apunte) o <strong>Texto</strong>. Podés sumarle una <strong>🖼️ Portada</strong> (imagen) y <strong>🎯 Objetivos</strong>.</p>
        </Section>

        <Section n="4" title="Subir un PDF (apunte)">
          <p>Creá una clase de tipo <strong>PDF</strong> y tocá <strong>"⬆️ Subir desde mi PC"</strong>. El alumno lo ve como un librito con zoom.</p>
        </Section>

        <Section n="5" title="Hacer un cuestionario (test con nota)">
          <p>En "Gestionar contenido", sección <strong>"📝 Cuestionarios"</strong> → <strong>"Nuevo cuestionario"</strong>. Agregá preguntas, las opciones y marcá la correcta.</p>
          <p>El alumno recibe la nota al instante. Para ver cómo respondió cada uno, tocá el botón <strong>📊</strong> (Resultados).</p>
        </Section>

        <Section n="6" title="Dar el certificado">
          <p>En la configuración del curso, tildá <strong>"🏆 Habilitar certificado"</strong>. Podés subir hasta dos <strong>firmas</strong> (imágenes) con su nombre.</p>
          <p>Cuando el alumno termina todas las clases, le aparece el botón para obtener su certificado.</p>
        </Section>

        <Section n="7" title="Clases en vivo y charlas (¡lo que más usás!)">
          <p>Hay <strong>dos formas</strong>, y las dos funcionan igual de fácil:</p>
          <p>🅰️ <strong>Charla suelta (abierta):</strong> en tu panel, arriba a la derecha, tocá el botón rojo <strong>"🔴 Charla en vivo"</strong>. Sirve para charlas que NO son de un curso. Les avisa a <strong>todos los alumnos</strong>.</p>
          <p>🅱️ <strong>Clase de un curso:</strong> entrá al curso → "Gestionar contenido" → <strong>"Programar clase en vivo"</strong>. Les avisa a los inscriptos de ese curso.</p>

          <p className="font-semibold text-gray-900 mt-3">En las dos completás lo mismo:</p>
          <ul className="space-y-1">
            <li>📌 <strong>Título</strong> (ej: "Charla: cómo mejorar tus fotos").</li>
            <li>📅 <strong>Fecha y hora.</strong></li>
            <li>🔗 <strong>El link de Zoom</strong> (o YouTube en vivo). Lo pegás ahí. Solo lo ve quien reserva o paga.</li>
            <li>💲 <strong>Precio</strong> (0 = gratis; o ponés un valor y cobran por la plataforma).</li>
          </ul>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mt-3 text-[16px]">
            <p className="font-semibold text-blue-900">📲 ¿De dónde saco el link de Zoom?</p>
            <p className="text-blue-900 mt-1">Abrís Zoom → "Programar una reunión" → ponés fecha y hora → te da un link (https://zoom.us/j/...). Ese link lo copiás y lo pegás acá. ¡Listo!</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mt-3 text-[16px]">
            <p className="font-semibold text-emerald-900">✨ La diferencia con hacerlo "a mano"</p>
            <p className="text-emerald-900 mt-1">Antes: ponías un flyer, te escribían, te transferían y vos mandabas el link uno por uno. <strong>Ahora la plataforma hace eso sola:</strong> el alumno ve la charla, paga (o reserva si es gratis) y le aparece el link automáticamente. Vos no tenés que mandar nada.</p>
            <p className="text-emerald-900 mt-1">Si preferís seguir cobrando por transferencia, ponés la charla <strong>gratis</strong> y avisás por WhatsApp como siempre — igual les llega el aviso y el link por la plataforma.</p>
          </div>
        </Section>

        <Section n="8" title="El foro y las estadísticas">
          <p>Cada curso tiene un <strong>foro</strong> (abajo, en el aula): los alumnos preguntan y vos respondés, fijás 📌 o borrás 🗑️.</p>
          <p>En tu panel, en <strong>"📈 Estadísticas"</strong>, ves cuántos se anotaron, pagaron, completaron, el avance y los asistentes a las clases en vivo.</p>
        </Section>

        <p className="text-center text-gray-400 text-sm pt-2">💾 Acordate de tocar <strong>"Guardar"</strong> después de cada cambio. ¡A disfrutar tu campus! 🌳</p>
      </div>
    </div>
  );
};

export default Help;

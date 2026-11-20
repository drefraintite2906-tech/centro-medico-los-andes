# Video "Somos tu clínica" – versión con presentadora

## Guion (≈ 30 s, voz femenina cálida, español de Panamá)
| Tiempo | Lo que dice la presentadora | Texto en pantalla |
|---|---|---|
| 0–6 s | "¿Por qué me atiendo en Centro Médico Los Andes?" | ¿Por qué me atiendo en Centro Médico Los Andes? |
| 6–12 s | "Porque siempre me reciben con una sonrisa." | Siempre me reciben con una sonrisa |
| 12–18 s | "Te invito: ven a Centro Médico Los Andes." | Medicina general · Especialistas · Odontología · Laboratorio · Ultrasonidos |
| 18–24 s | "Estamos en el Centro Comercial Los Andes, local B15." | C.C. Los Andes · Local B15 |
| 24–31 s | "Nuestros teléfonos: 237-9094, y WhatsApp 6056-8129." | Tel. 237-9094 · WhatsApp 6056-8129 + QR |
| 31–38 s | "Recuerda… ¡somos tu clínica!" | Logo original + "Somos tu clínica" |

Leer los números así: "dos, tres, siete, noventa, noventa y cuatro" y "seis, cero, cinco, seis, ochenta y uno, veintinueve".

## Cómo grabarla (de mejor a más rápido)
1. **Recomendado: una persona real** (recepcionista, enfermera o paciente que acepte) grabada con el celular en vertical, en la recepción, con luz natural de frente. Firmar autorización de uso de imagen. Luego se monta sobre las escenas de `cmla-somos-tu-clinica-9x16.mp4`.
2. **Presentadora con IA** (HeyGen, Synthesia, Veo, Kling): pegar el guion y usar este prompt:

> Vertical 9:16 video, 4K. A friendly Latina woman in her late twenties, natural look, warm genuine smile, light-blue medical-style blouse, standing in a bright modern clinic reception with soft natural light and shallow depth of field. She speaks directly to camera in Latin American Spanish (Panamanian accent), warm and sincere tone, natural hand gestures, subtle slow push-in camera. Realistic skin, no artificial look. Leave the lower third free for on-screen text.

   Si se usa IA: no presentarla como paciente real ni mostrar una "recepción" inventada como si fuera la de CMLA; colocar "Imagen generada con IA" en letra pequeña.

## Archivos
- `cmla-somos-tu-clinica-9x16.mp4`: versión animada, 1080×1920, 38 s, música original sin derechos de terceros.
- `escenas.html` + `grabar.cjs`: fuente editable; `node grabar.cjs salida.mp4 38 30` (necesita Playwright y ffmpeg; copiar junto a `logo-cma.jpg` y `qr-whatsapp.png`).

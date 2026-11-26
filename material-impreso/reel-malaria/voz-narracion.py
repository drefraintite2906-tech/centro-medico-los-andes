import soundfile as sf, json
from kokoro_onnx import Kokoro
k=Kokoro("kokoro-v1.0.onnx","voices-v1.0.bin")
T=[
"¿Fiebre con escalofríos? ¡Ojo! Podría ser malaria.",
"La malaria es una infección por un parásito que transmite el mosquito Anófeles, sobre todo al atardecer y de noche. En Panamá todavía hay casos.",
"Sus síntomas: fiebre que va y viene, escalofríos intensos, sudoración abundante, dolor de cabeza y de cuerpo, náuseas, vómitos, y mucho cansancio.",
"¿Cómo se diagnostica? Solo con un examen de sangre: la gota gruesa o una prueba rápida. Y muy importante: dile a tu médico si viajaste a una zona con malaria.",
"¿Por qué ir al médico? Porque puede agravarse en pocas horas. Necesita un tratamiento específico con receta, y completarlo evita que la enfermedad regrese.",
"Signos de gravedad: confusión o mucho sueño, convulsiones, dificultad para respirar, piel u ojos amarillos, orina oscura, vómitos que no paran, o sangrado. Si los tienes, ¡ve a urgencias de inmediato!",
"Para prevenirla, duerme con mosquitero, usa repelente y ropa de manga larga al atardecer, y consulta antes de viajar a zonas de riesgo.",
"¿Fiebre después de viajar? No esperes. En Centro Médico Los Andes te evaluamos y te orientamos.",
"Centro Médico Los Andes. Tu salud es nuestra razón de ser.",
]
d=[]
for i,t in enumerate(T):
    s,sr=k.create(t,voice="ef_dora",speed=1.05,lang="es")
    sf.write(f"m{i+1}.wav",s,sr); d.append(round(len(s)/sr,2))
print(json.dumps(d))

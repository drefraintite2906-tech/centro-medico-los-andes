import soundfile as sf, json
from kokoro_onnx import Kokoro
k=Kokoro("kokoro-v1.0.onnx","voices-v1.0.bin")
T=[
"¿Fiebre alta de repente? ¡Ojo! Podría ser dengue.",
"El dengue es un virus que transmite el mosquito Aedes egipti. Cualquiera puede enfermar, y más de una vez.",
"Sus síntomas: fiebre alta, dolor de cabeza intenso, dolor detrás de los ojos, dolor de músculos y articulaciones, náuseas, vómitos, y manchas en la piel.",
"¿Por qué ir al médico? Porque puede complicarse, aunque al principio parezca leve. Vigilamos tus plaquetas y tu hidratación, y te indicamos un tratamiento seguro.",
"Y no te automediques. La aspirina, el ibuprofeno, el diclofenaco o el naproxeno pueden aumentar el riesgo de sangrado.",
"Mucho ojo: el peligro puede llegar cuando la fiebre baja, entre el día tres y el día siete.",
"Signos de alarma: dolor de barriga intenso, vómitos que no paran, sangrado, mucho sueño o confusión, mareo al ponerte de pie, manos y pies fríos, o poca orina. Si los tienes, ¡ve a urgencias de inmediato!",
"Para prevenirlo, elimina el agua acumulada, usa repelente y mosquiteros.",
"¿Tienes síntomas? No esperes. En Centro Médico Los Andes te evaluamos, con consulta y laboratorio en un mismo lugar.",
"Centro Médico Los Andes. Tu salud es nuestra razón de ser.",
]
d=[]
for i,t in enumerate(T):
    s,sr=k.create(t,voice="ef_dora",speed=1.05,lang="es")
    sf.write(f"v{i+1}.wav",s,sr); d.append(round(len(s)/sr,2))
print(json.dumps(d))

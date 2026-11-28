import soundfile as sf, json
from kokoro_onnx import Kokoro
k=Kokoro("kokoro-v1.0.onnx","voices-v1.0.bin")
T=[
"¿Te cortaste o te raspaste? ¡Calma! Así se cuida una herida pequeña en casa.",
"Paso uno: lávate bien las manos con agua y jabón.",
"Paso dos: detén el sangrado. Presiona firme con una gasa o un paño limpio, de cinco a diez minutos, sin levantarlo.",
"Paso tres: limpia la herida con agua limpia, y lava con jabón alrededor, quitando la suciedad.",
"Paso cuatro: cúbrela con una curita o una venda limpia, y cámbiala cada día, o si se moja o se ensucia.",
"¡Y no hagas esto! No pongas café, pasta dental ni remedios caseros. Evita el alcohol dentro de la herida, y no arranques la costra.",
"Vigila las señales de infección: enrojecimiento que se extiende, más dolor o hinchazón, calor, pus o fiebre.",
"Acude al médico si no deja de sangrar después de diez minutos, si es profunda o abierta, si fue una mordedura, si tiene un objeto clavado, o si es sucia u oxidada y tu vacuna antitetánica no está al día. Si sangra mucho, presiona y llama al nueve, uno, uno.",
"En Centro Médico Los Andes te ayudamos con curaciones y cirugía menor. ¡Te esperamos!",
"Centro Médico Los Andes. Tu salud es nuestra razón de ser.",
]
d=[]
for i,t in enumerate(T):
    s,sr=k.create(t,voice="ef_dora",speed=1.05,lang="es")
    sf.write(f"h{i+1}.wav",s,sr); d.append(round(len(s)/sr,2))
print(json.dumps(d))

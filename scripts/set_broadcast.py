import json
with open('/root/Bot-flex-/data.json','r') as f:
    db = json.load(f)
db['pendingBroadcast'] = (
    '\U0001f195 *FlexBot \u2014 Nueva Actualizaci\u00f3n*\n\n'
    'Se ha a\u00f1adido el sistema de *Rangos y Actividad* \U0001f3c6\n\n'
    'Los usuarios suben o bajan de rango seg\u00fan las reacciones que reciben \U0001f44d\u2764\ufe0f\U0001f525\n'
    '\U0001f331 Nuevo \u2192 \u2b50 Popular \u2192 \U0001f48e Influyente \u2192 \U0001f451 Leyenda\n\n'
    '*Nuevos comandos:*\n'
    '\u25b8 .perfil @usuario \u2014 Rango y reacciones\n'
    '\u25b8 .miranking \u2014 Tu propio perfil\n'
    '\u25b8 .ranking \u2014 Top del grupo\n'
    '\u25b8 .inactivos [dias] \u2014 Lista inactivos\n\n'
    '\u2728 _FlexBot_'
)
with open('/root/Bot-flex-/data.json','w') as f:
    json.dump(db, f, indent=2, ensure_ascii=False)
print('pendingBroadcast configurado OK')

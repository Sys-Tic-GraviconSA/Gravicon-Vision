import sys

p = 'src/views/mantenimiento/DisponibilidadTab.vue'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

repl = [
    ('#172954', '#1D4ED8'),
    ('#2a3f6b', '#2563EB'),
    ('#1f7a3d', '#16A34A'),
    ('#a90707', '#DC2626'),
    ('#b8860b', '#F59E0B'),
    ('#2E8B8F', '#06B6D4'),
]

for old, new in repl:
    c = c.replace(old, new)
    c = c.replace(old.lower(), new)

with open(p, 'w', encoding='utf-8') as f:
    f.write(c)

print('OK - colores reemplazados')

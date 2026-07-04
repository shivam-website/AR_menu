import trimesh
import numpy as np
import os

SRC = os.path.join(os.path.dirname(__file__), "temp_models", "food_kit", "Models", "GLB format")
OUT = os.path.join(os.path.dirname(__file__), "static", "models")
os.makedirs(OUT, exist_ok=True)


def load(name):
    return trimesh.load(os.path.join(SRC, name), force="mesh")


def move(mesh, x=0, y=0, z=0):
    mesh.apply_translation([x, y, z])
    return mesh


def scale(mesh, s):
    mesh.apply_scale(s)
    return mesh


def color(mesh, r, g, b, a=255):
    mesh.visual.vertex_colors = [r, g, b, a]
    return mesh


# === MOMO === dim-sum dumpling on a plate
print("Building momo...")
momo_dumpling = load("dim-sum.glb")
scale(momo_dumpling, 1.5)
move(momo_dumpling, z=0.02)

momo_plate = load("plate.glb")
scale(momo_plate, 1.2)

momo = trimesh.util.concatenate([momo_dumpling, momo_plate])
momo.export(os.path.join(OUT, "momo.glb"), file_type="glb")
print(f"  momo.glb ({os.path.getsize(os.path.join(OUT, 'momo.glb'))} bytes)")

# === CHOWMEIN === chinese takeout box with noodles
print("Building chowmein...")
chow_box = load("chinese.glb")
scale(chow_box, 1.8)
move(chow_box, z=0.02)

noodles = load("bowl-cereal.glb")
scale(noodles, 0.8)
move(noodles, x=0.3, z=0.05)

chopstick1 = load("chopstick.glb")
scale(chopstick1, 2.0)
move(chopstick1, x=-0.15, y=0.1, z=0.15)
color(chopstick1, 139, 90, 43)

chowmein = trimesh.util.concatenate([chow_box, noodles, chopstick1])
chowmein.export(os.path.join(OUT, "chowmein.glb"), file_type="glb")
print(f"  chowmein.glb ({os.path.getsize(os.path.join(OUT, 'chowmein.glb'))} bytes)")

# === PANIPURI === plate with small round items
print("Building panipuri...")
pani_plate = load("plate-dinner.glb")
scale(pani_plate, 0.9)

pani_puris = []
angles = np.linspace(0, 2 * np.pi, 6)[:-1]
for i, a in enumerate(angles):
    x, y = 0.12 * np.cos(a), 0.12 * np.sin(a)
    ball = load("egg.glb")
    scale(ball, 0.35)
    move(ball, x=x, y=y, z=0.04)
    color(ball, 210, 180, 100)
    pani_puris.append(ball)

    filling = load("meat-patty.glb")
    scale(filling, 0.15)
    move(filling, x=x, y=y, z=0.08)
    color(filling, 80, 140, 50)
    pani_puris.append(filling)

center_puri = load("egg.glb")
scale(center_puri, 0.35)
move(center_puri, z=0.04)
color(center_puri, 210, 180, 100)
pani_puris.append(center_puri)

center_filling = load("meat-patty.glb")
scale(center_filling, 0.15)
move(center_filling, z=0.08)
color(center_filling, 80, 140, 50)
pani_puris.append(center_filling)

panipuri = trimesh.util.concatenate([pani_plate] + pani_puris)
panipuri.export(os.path.join(OUT, "panipuri.glb"), file_type="glb")
print(f"  panipuri.glb ({os.path.getsize(os.path.join(OUT, 'panipuri.glb'))} bytes)")

# === DAL BHAT === thali plate with rice, dal bowl, sides
print("Building dal bhat...")
dal_thali = load("plate-dinner.glb")
scale(dal_thali, 1.0)

rice_bowl = load("bowl.glb")
scale(rice_bowl, 0.8)
move(rice_bowl, x=-0.08, y=0.05, z=0.02)
color(rice_bowl, 255, 255, 240)

rice = load("rice-ball.glb")
scale(rice, 1.2)
move(rice, x=-0.08, y=0.05, z=0.08)
color(rice, 255, 255, 240)

dal_bowl = load("bowl-soup.glb")
scale(dal_bowl, 0.6)
move(dal_bowl, x=0.12, y=-0.06, z=0.02)
color(dal_bowl, 200, 150, 40)

dal = load("bowl-broth.glb")
scale(dal, 0.5)
move(dal, x=0.12, y=-0.06, z=0.05)
color(dal, 200, 150, 40)

veg = load("salad.glb")
scale(veg, 0.5)
move(veg, x=-0.10, y=-0.08, z=0.04)
color(veg, 100, 160, 60)

achar = load("bowl-soup.glb")
scale(achar, 0.4)
move(achar, x=0.10, y=0.10, z=0.02)
color(achar, 180, 60, 30)

dalbhat = trimesh.util.concatenate([dal_thali, rice_bowl, rice, dal_bowl, dal, veg, achar])
dalbhat.export(os.path.join(OUT, "dalbhat.glb"), file_type="glb")
print(f"  dalbhat.glb ({os.path.getsize(os.path.join(OUT, 'dalbhat.glb'))} bytes)")

# === SAMOSA === plate with triangular items
print("Building samosa...")
samosa_plate = load("plate.glb")
scale(samosa_plate, 1.0)

samosas = []
positions = [(0, 0.06), (-0.07, -0.05), (0.07, -0.05)]
for x, y in positions:
    s = load("cheese.glb")
    scale(s, 0.25)
    move(s, x=x, y=y, z=0.03)
    color(s, 210, 150, 50)
    samosas.append(s)

samosa = trimesh.util.concatenate([samosa_plate] + samosas)
samosa.export(os.path.join(OUT, "samosa.glb"), file_type="glb")
print(f"  samosa.glb ({os.path.getsize(os.path.join(OUT, 'samosa.glb'))} bytes)")

print("\nAll real models built!")

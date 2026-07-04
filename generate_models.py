import trimesh
import numpy as np
import os

OUTPUT = os.path.join(os.path.dirname(__file__), "static", "models")
os.makedirs(OUTPUT, exist_ok=True)


def make_momo():
    """Steamed dumpling: dome shape with pinched top"""
    base = trimesh.creation.cone(radius=0.12, height=0.08, sections=32)
    base.apply_translation([0, 0, 0.04])

    dome = trimesh.creation.uv_sphere(radius=0.10, count=[32, 16])
    dome.apply_scale([1, 1, 0.5])
    dome.apply_translation([0, 0, 0.08])

    pinch = trimesh.creation.cone(radius=0.02, height=0.04, sections=16)
    pinch.apply_translation([0, 0, 0.14])

    body = trimesh.util.concatenate([base, dome, pinch])
    body.visual.vertex_colors = [210, 180, 140, 255]

    plate = trimesh.creation.cylinder(radius=0.18, height=0.015, sections=32)
    plate.apply_translation([0, 0, -0.007])
    plate.visual.vertex_colors = [255, 255, 255, 255]

    return trimesh.util.concatenate([body, plate])


def make_chowmein():
    """Bowl of noodles: bowl + noodle pile"""
    bowl_outer = trimesh.creation.cone(radius=0.16, height=0.10, sections=32, section_count=1)
    bowl_outer.apply_translation([0, 0, 0.05])
    bowl_outer.visual.vertex_colors = [60, 60, 60, 255]

    bowl_inner = trimesh.creation.cone(radius=0.14, height=0.08, sections=32)
    bowl_inner.apply_translation([0, 0, 0.06])
    bowl_inner.visual.vertex_colors = [240, 240, 240, 255]

    noodles = trimesh.creation.uv_sphere(radius=0.12, count=[24, 12])
    noodles.apply_scale([1, 1, 0.4])
    noodles.apply_translation([0, 0, 0.11])
    noodles.visual.vertex_colors = [240, 190, 70, 255]

    garnish = trimesh.creation.uv_sphere(radius=0.03, count=[12, 8])
    garnish.apply_translation([0.04, 0.03, 0.15])
    garnish.visual.vertex_colors = [50, 160, 50, 255]

    return trimesh.util.concatenate([bowl_outer, bowl_inner, noodles, garnish])


def make_panipuri():
    """Plate of 5 panipuri: round crispy shells"""
    group = []

    plate = trimesh.creation.cylinder(radius=0.18, height=0.012, sections=32)
    plate.apply_translation([0, 0, -0.006])
    plate.visual.vertex_colors = [255, 255, 255, 255]
    group.append(plate)

    angles = np.linspace(0, 2 * np.pi, 6)[:-1]
    for i, a in enumerate(angles):
        x, y = 0.10 * np.cos(a), 0.10 * np.sin(a)

        shell = trimesh.creation.uv_sphere(radius=0.045, count=[16, 8])
        shell.apply_scale([1, 1, 0.7])
        shell.apply_translation([x, y, 0.035])
        shell.visual.vertex_colors = [190, 140, 60, 255]
        group.append(shell)

        filling = trimesh.creation.cylinder(radius=0.025, height=0.02, sections=12)
        filling.apply_translation([x, y, 0.07])
        filling.visual.vertex_colors = [80, 140, 60, 255]
        group.append(filling)

    return trimesh.util.concatenate(group)


def make_dalbhat():
    """Thali plate: rice mound + dal bowl + sides"""
    group = []

    thali = trimesh.creation.cylinder(radius=0.20, height=0.012, sections=32)
    thali.apply_translation([0, 0, -0.006])
    thali.visual.vertex_colors = [200, 200, 200, 255]
    group.append(thali)

    rice = trimesh.creation.uv_sphere(radius=0.10, count=[24, 12])
    rice.apply_scale([1, 1, 0.4])
    rice.apply_translation([-0.02, 0.02, 0.04])
    rice.visual.vertex_colors = [255, 255, 240, 255]
    group.append(rice)

    dal = trimesh.creation.cone(radius=0.06, height=0.04, sections=16)
    dal.apply_translation([0.10, -0.06, 0.02])
    dal.visual.vertex_colors = [200, 150, 40, 255]
    group.append(dal)

    veg = trimesh.creation.uv_sphere(radius=0.04, count=[12, 8])
    veg.apply_translation([-0.10, -0.08, 0.04])
    veg.visual.vertex_colors = [100, 160, 60, 255]
    group.append(veg)

    achar = trimesh.creation.cylinder(radius=0.03, height=0.02, sections=12)
    achar.apply_translation([0.08, 0.10, 0.01])
    achar.visual.vertex_colors = [180, 60, 30, 255]
    group.append(achar)

    return trimesh.util.concatenate(group)


def make_samosa():
    """3 triangular samosas on a plate"""
    group = []

    plate = trimesh.creation.cylinder(radius=0.16, height=0.012, sections=32)
    plate.apply_translation([0, 0, -0.006])
    plate.visual.vertex_colors = [255, 255, 255, 255]
    group.append(plate)

    positions = [(0, 0.06), (-0.08, -0.06), (0.08, -0.06)]
    for x, y in positions:
        v = np.array([
            [0, 0, 0],
            [0.06, -0.04, 0],
            [-0.06, -0.04, 0],
            [0, 0, 0.08],
        ])
        f = np.array([
            [0, 1, 2],
            [0, 1, 3],
            [0, 2, 3],
            [1, 2, 3],
        ])
        tri = trimesh.Trimesh(vertices=v, faces=f)
        tri.apply_translation([x, y, 0.01])
        tri.visual.vertex_colors = [210, 130, 40, 255]
        group.append(tri)

    return trimesh.util.concatenate(group)


models = {
    "momo.glb": make_momo,
    "chowmein.glb": make_chowmein,
    "panipuri.glb": make_panipuri,
    "dalbhat.glb": make_dalbhat,
    "samosa.glb": make_samosa,
}

for name, builder in models.items():
    path = os.path.join(OUTPUT, name)
    mesh = builder()
    mesh.export(path, file_type="glb")
    print(f"Created {path} ({os.path.getsize(path)} bytes)")

print("\nAll models generated!")

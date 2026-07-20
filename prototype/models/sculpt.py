#!/usr/bin/env python3
"""
STARFALL — Blender character sculpt pipeline (headless via `bpy`).

Builds real 3D meshes for the showcase Primes and exports glTF (.glb):
an organic body sculpted with the Skin modifier + Subdivision Surface
(smooth, merged limbs — the leap over assembled primitives), plus
hard-surface armor/props and PBR materials (metallic + emission).

Run:  python3 prototype/models/sculpt.py
Out:  prototype/models/kaelis.glb, prototype/models/juno.glb
"""
import bpy, bmesh, os, math
from mathutils import Vector

OUT = os.path.dirname(os.path.abspath(__file__))


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, color, metallic=0.8, rough=0.4, emit=None, emit_str=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    ins = b.inputs
    ins['Base Color'].default_value = (*color, 1.0)
    if 'Metallic' in ins: ins['Metallic'].default_value = metallic
    if 'Roughness' in ins: ins['Roughness'].default_value = rough
    if emit is not None:
        if 'Emission Color' in ins: ins['Emission Color'].default_value = (*emit, 1.0)
        if 'Emission Strength' in ins: ins['Emission Strength'].default_value = emit_str
    return m


def skin_body(name, joints, edges, radii, mtl, subsurf=2):
    """Build an organic limbed body: edge skeleton -> Skin -> Subsurf -> apply."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([Vector(j) for j in joints], edges, [])
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    sk = ob.modifiers.new('Skin', 'SKIN')
    # radii per vertex
    sv = ob.data.skin_vertices[0].data
    for i, r in enumerate(radii):
        sv[i].radius = (r, r)
    sv[0].use_root = True
    ss = ob.modifiers.new('Subsurf', 'SUBSURF'); ss.levels = subsurf; ss.render_levels = subsurf
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier='Skin')
    bpy.ops.object.modifier_apply(modifier='Subsurf')
    ob.data.materials.append(mtl)
    return ob


def prim(kind, mtl, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), **kw):
    if kind == 'uv': bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, location=loc)
    elif kind == 'ico': bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=kw.get('sub', 2), location=loc)
    elif kind == 'cyl': bpy.ops.mesh.primitive_cylinder_add(vertices=kw.get('v', 20), location=loc)
    elif kind == 'cone': bpy.ops.mesh.primitive_cone_add(vertices=kw.get('v', 12), location=loc)
    elif kind == 'cube': bpy.ops.mesh.primitive_cube_add(location=loc)
    elif kind == 'torus': bpy.ops.mesh.primitive_torus_add(location=loc, major_radius=kw.get('R', 1), minor_radius=kw.get('r', 0.1))
    ob = bpy.context.active_object
    ob.rotation_euler = rot; ob.scale = scale
    ob.data.materials.append(mtl)
    # smooth shade organic prims
    if kind in ('uv', 'ico', 'cyl', 'cone', 'torus'):
        bpy.ops.object.shade_smooth()
    return ob


def solidify_cloak(mtl_out, mtl_in):
    """A caped cloak: curved grid, folds via sine, solidified + subdivided."""
    me = bpy.data.meshes.new('cloak')
    bm = bmesh.new()
    cols, rows = 14, 10
    verts = [[None] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            u = c / (cols - 1)          # 0..1 around
            v = r / (rows - 1)          # 0 top .. 1 bottom
            ang = math.pi * (0.5 + u * 1.0)          # wrap ~180deg behind
            rad = 0.34 + v * 0.95                    # flares out at the hem
            fold = math.sin(u * math.pi * 5) * 0.06 * v   # vertical folds
            x = math.cos(ang) * rad
            y = math.sin(ang) * rad - 0.1 - fold
            z = 1.95 - v * 1.95                      # shoulders -> floor
            verts[r][c] = bm.verts.new((x, y, z))
    bm.verts.index_update()
    for r in range(rows - 1):
        for c in range(cols - 1):
            bm.faces.new([verts[r][c], verts[r][c + 1], verts[r + 1][c + 1], verts[r + 1][c]])
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new('cloak', me)
    bpy.context.collection.objects.link(ob)
    sol = ob.modifiers.new('Sol', 'SOLIDIFY'); sol.thickness = 0.05
    ss = ob.modifiers.new('SS', 'SUBSURF'); ss.levels = 2
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier='Sol')
    bpy.ops.object.modifier_apply(modifier='SS')
    bpy.ops.object.shade_smooth()
    ob.data.materials.append(mtl_out)
    return ob


def export(name):
    bpy.ops.object.select_all(action='SELECT')
    path = os.path.join(OUT, name + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True)
    print('exported', path, os.path.getsize(path), 'bytes')


# ---------------------------------------------------------------- Kaelis Vantar
def build_kaelis():
    reset()
    dark = mat('k_suit', (0.05, 0.04, 0.08), 0.6, 0.45)
    plate = mat('k_plate', (0.14, 0.11, 0.22), 0.9, 0.28)
    gold = mat('k_gold', (1.0, 0.78, 0.32), 1.0, 0.22, emit=(0.25, 0.15, 0.0), emit_str=0.4)
    void = mat('k_void', (0.75, 0.5, 0.99), 0.2, 0.3, emit=(0.66, 0.35, 1.0), emit_str=3.0)
    cloakm = mat('k_cloak', (0.045, 0.035, 0.08), 0.2, 0.85)

    # organic knight body (Z up)
    J = [
        (0.0, 0.0, 1.02),   # 0 pelvis (root)
        (0.0, 0.0, 1.42),   # 1 lower spine
        (0.0, 0.0, 1.78),   # 2 chest
        (0.0, 0.0, 2.02),   # 3 neck
        (0.0, 0.0, 2.28),   # 4 head
        (0.34, 0.0, 1.88),  # 5 R shoulder
        (0.52, 0.0, 1.48),  # 6 R elbow
        (0.60, 0.06, 1.06), # 7 R hand
        (-0.34, 0.0, 1.88), # 8 L shoulder
        (-0.52, 0.0, 1.48), # 9 L elbow
        (-0.60, 0.06, 1.06),# 10 L hand
        (0.17, 0.0, 0.94),  # 11 R hip
        (0.19, 0.02, 0.5),  # 12 R knee
        (0.19, 0.12, 0.06), # 13 R foot
        (-0.17, 0.0, 0.94), # 14 L hip
        (-0.19, 0.02, 0.5), # 15 L knee
        (-0.19, 0.12, 0.06),# 16 L foot
    ]
    E = [(0,1),(1,2),(2,3),(3,4),(2,5),(5,6),(6,7),(2,8),(8,9),(9,10),
         (0,11),(11,12),(12,13),(0,14),(14,15),(15,16)]
    R = [0.22,0.20,0.24,0.10,0.16, 0.14,0.09,0.10, 0.14,0.09,0.10,
         0.13,0.10,0.10, 0.13,0.10,0.10]
    skin_body('kaelis_body', J, E, R, dark, subsurf=2)

    # chest & shoulder plating
    ch = prim('ico', plate, loc=(0, 0.08, 1.8), scale=(0.32, 0.24, 0.34), sub=2)
    prim('cube', gold, loc=(0, 0.28, 1.82), scale=(0.03, 0.02, 0.2))          # sternum
    prim('cyl', void, loc=(0, 0.3, 1.92), rot=(math.pi/2, 0, 0), scale=(0.06, 0.06, 0.03), v=6)  # core
    for s in (-1, 1):
        prim('ico', plate, loc=(0.33*s, 0, 1.9), scale=(0.19, 0.17, 0.19), sub=2)   # pauldron
        prim('torus', gold, loc=(0.33*s, 0, 1.82), rot=(math.pi/2.1, 0, 0), R=0.17, r=0.02)
        prim('cone', void, loc=(0.4*s, 0, 2.06), rot=(0, 0, 0.3*s), scale=(0.05, 0.05, 0.22), v=8)
    # belt + faulds
    prim('torus', gold, loc=(0, 0, 1.16), rot=(math.pi/2, 0, 0), R=0.24, r=0.03)
    for i in range(-2, 3):
        prim('cube', plate, loc=(i*0.11, 0.16, 0.98), rot=(0.2, 0, 0), scale=(0.06, 0.02, 0.16))
    # gauntlets + boots
    for s in (-1, 1):
        prim('cube', plate, loc=(0.53*s, 0.05, 1.12), scale=(0.09, 0.09, 0.1))
        prim('cube', plate, loc=(0.19*s, 0.12, 0.05), scale=(0.1, 0.14, 0.07))

    # crowned helm over the head
    prim('uv', plate, loc=(0, 0.0, 2.3), scale=(0.2, 0.2, 0.22))
    prim('cube', void, loc=(0, 0.19, 2.3), scale=(0.14, 0.02, 0.03))          # visor
    for i in range(5):
        a = (i/4 - 0.5) * 1.4
        prim('cone', gold if i % 2 else void,
             loc=(math.sin(a)*0.16, -0.04, 2.5), rot=(0.5, a, math.sin(a)*0.4),
             scale=(0.03, 0.03, 0.16 + abs(a)*0.05), v=6)

    # flowing cloak
    solidify_cloak(cloakm, cloakm)
    prim('uv', gold, loc=(0, -0.02, 2.02), scale=(0.06, 0.06, 0.06))          # clasp

    # floating greatsword to his right
    prim('cube', plate, loc=(0.95, 0.14, 1.5), rot=(0, 0, -0.28), scale=(0.05, 0.02, 0.95))   # blade
    prim('cube', void, loc=(0.99, 0.14, 1.5), rot=(0, 0, -0.28), scale=(0.02, 0.03, 0.96))    # edge
    prim('cube', gold, loc=(0.86, 0.14, 0.98), rot=(0, 0, -0.28), scale=(0.24, 0.05, 0.05))   # guard
    prim('uv', void, loc=(0.83, 0.14, 0.78), scale=(0.06, 0.06, 0.06))                        # pommel

    export('kaelis')


# ---------------------------------------------------------------- Juno-9
def build_juno():
    reset()
    white = mat('j_suit', (0.82, 0.86, 0.95), 0.35, 0.5)
    dark = mat('j_underlay', (0.09, 0.11, 0.18), 0.6, 0.4)
    cyan = mat('j_cyan', (0.49, 0.83, 0.99), 0.2, 0.3, emit=(0.36, 0.72, 1.0), emit_str=3.0)
    hair = mat('j_hair', (0.16, 0.2, 0.32), 0.3, 0.55)

    # slimmer idol body
    J = [
        (0.0, 0.0, 1.02),   # 0 pelvis
        (0.0, 0.0, 1.42),   # 1 waist
        (0.0, 0.0, 1.72),   # 2 chest
        (0.0, 0.0, 1.96),   # 3 neck
        (0.0, 0.0, 2.18),   # 4 head
        (0.24, 0.0, 1.82),  # 5 R shoulder
        (0.34, 0.05, 1.5),  # 6 R elbow
        (0.28, 0.22, 1.7),  # 7 R hand (raised, mic to face)
        (-0.24, 0.0, 1.82), # 8 L shoulder
        (-0.34, 0.0, 1.5),  # 9 L elbow
        (-0.36, 0.05, 1.2), # 10 L hand
        (0.13, 0.0, 0.94),  # 11 R hip
        (0.15, 0.02, 0.5),  # 12 R knee
        (0.15, 0.1, 0.05),  # 13 R foot
        (-0.13, 0.0, 0.94), # 14 L hip
        (-0.15, 0.02, 0.5), # 15 L knee
        (-0.15, 0.1, 0.05), # 16 L foot
    ]
    E = [(0,1),(1,2),(2,3),(3,4),(2,5),(5,6),(6,7),(2,8),(8,9),(9,10),
         (0,11),(11,12),(12,13),(0,14),(14,15),(15,16)]
    R = [0.18,0.16,0.19,0.09,0.19, 0.10,0.07,0.07, 0.10,0.07,0.07,
         0.11,0.09,0.08, 0.11,0.09,0.08]
    skin_body('juno_body', J, E, R, white, subsurf=2)

    # cyan seams + core
    prim('cube', cyan, loc=(0, 0.19, 1.74), scale=(0.02, 0.02, 0.22))
    prim('uv', cyan, loc=(0, 0.2, 1.86), scale=(0.05, 0.05, 0.05))
    for s in (-1, 1):
        prim('torus', cyan, loc=(0.15*s, 0, 0.5), rot=(math.pi/2, 0, 0), R=0.11, r=0.015)  # knee bands
        prim('uv', cyan, loc=(0.24*s, 0, 1.82), scale=(0.09, 0.09, 0.09))                  # shoulder caps

    # head: visor, headset, hair
    prim('cube', cyan, loc=(0, 0.17, 2.2), scale=(0.15, 0.03, 0.03))          # visor
    prim('torus', dark, loc=(0, 0, 2.28), rot=(0.3, 0, 0), R=0.2, r=0.02)     # headset band
    for s in (-1, 1):
        prim('cyl', cyan, loc=(0.19*s, 0, 2.18), rot=(0, math.pi/2, 0), scale=(0.07, 0.07, 0.04))  # ear cans
    prim('cyl', dark, loc=(-0.16, 0.14, 2.12), rot=(0.5, 0, -0.5), scale=(0.012, 0.012, 0.14))     # mic boom
    # hair cap + twin ponytails
    prim('uv', hair, loc=(0, -0.02, 2.28), scale=(0.22, 0.22, 0.16))
    for s in (-1, 1):
        prim('cone', hair, loc=(0.16*s, -0.14, 2.05), rot=(1.9, 0, 0.2*s), scale=(0.06, 0.06, 0.5), v=8)
        prim('cone', cyan, loc=(0.22*s, -0.32, 1.72), rot=(1.9, 0, 0.2*s), scale=(0.025, 0.025, 0.1), v=6)

    # microphone at the raised hand
    prim('cyl', dark, loc=(0.26, 0.24, 1.9), rot=(0.4, 0, 0), scale=(0.025, 0.025, 0.14))
    prim('uv', cyan, loc=(0.24, 0.28, 2.06), scale=(0.07, 0.07, 0.07))

    export('juno')


if __name__ == '__main__':
    build_kaelis()
    build_juno()
    print('DONE')

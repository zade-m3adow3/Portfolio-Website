import bpy
import math
import os

# Ensure we are in object mode
if bpy.context.object and bpy.context.object.mode != 'OBJECT':
    bpy.ops.object.mode_set(mode='OBJECT')

# Safely clear the scene instead of read_factory_settings
for obj in bpy.context.scene.objects:
    bpy.data.objects.remove(obj, do_unlink=True)
for mesh in bpy.data.meshes:
    bpy.data.meshes.remove(mesh, do_unlink=True)
for mat in bpy.data.materials:
    bpy.data.materials.remove(mat, do_unlink=True)
for action in bpy.data.actions:
    bpy.data.actions.remove(action, do_unlink=True)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'

if not scene.world:
    new_world = bpy.data.worlds.new("World")
    scene.world = new_world

scene.world.use_nodes = True

# Set world background to #05050c
world_tree = scene.world.node_tree
bg_node = world_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs[0].default_value = (0.05 / 255.0, 0.05 / 255.0, 0.012 / 255.0, 1) # Approx for #05050c in linear

def hex_to_rgba(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16)/255.0 for i in (0, 2, 4)) + (1.0,)

def get_principled_bsdf(mat):
    for node in mat.node_tree.nodes:
        if node.type == 'BSDF_PRINCIPLED':
            return node
    return None

def create_material(name, base_color_hex, metallic=0.0, roughness=0.5, emission_hex=None, emission_strength=1.0, transmission=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = get_principled_bsdf(mat)
    if not bsdf:
        return mat
        
    bsdf.inputs['Base Color'].default_value = hex_to_rgba(base_color_hex)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    
    # Handle transmission (Glass-like)
    if transmission > 0.0:
        if 'Transmission Weight' in bsdf.inputs: # Blender 4.0+
            bsdf.inputs['Transmission Weight'].default_value = transmission
        elif 'Transmission' in bsdf.inputs: # Blender 3.x
            bsdf.inputs['Transmission'].default_value = transmission
    
    # Handle emission (GLTF exporter uses Principled BSDF emission)
    if emission_hex:
        em_color = hex_to_rgba(emission_hex)
        if 'Emission Color' in bsdf.inputs: # Blender 4.0+
            bsdf.inputs['Emission Color'].default_value = em_color
        elif 'Emission' in bsdf.inputs: # Blender 3.x
            bsdf.inputs['Emission'].default_value = em_color
            
        if 'Emission Strength' in bsdf.inputs:
            bsdf.inputs['Emission Strength'].default_value = emission_strength
            
    return mat

# --- Materials ---
mat_silicon = create_material("mat_silicon", "#1a1a2e", metallic=0.1, roughness=0.8)
mat_crossbar = create_material("mat_crossbar", "#00c8ff", emission_hex="#00c8ff", emission_strength=0.6)
mat_cnt_pillar = create_material("mat_cnt_pillar", "#e8c547", emission_hex="#e8c547", emission_strength=0.4, transmission=0.4)
mat_graphene = create_material("mat_graphene", "#1c1c2e", metallic=0.9, roughness=0.1)
mat_hbn = create_material("mat_hbn", "#f0f0e0", transmission=0.2)
mat_mram = create_material("mat_mram", "#ff3864", emission_hex="#ff3864", emission_strength=0.3)
mat_sram = create_material("mat_sram", "#0af5a0", emission_hex="#0af5a0", emission_strength=0.4)
mat_shadow = create_material("mat_shadow", "#2a2a4e", roughness=0.6)

# Root Empty for organizing layers
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
root_obj = bpy.context.active_object
root_obj.name = "APUX_Root"

# Dictionary to hold the layers so we can animate them easily
layers = {}

# --- Layer Construction ---
def create_layer_01_base():
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.5))
    base = bpy.context.active_object
    base.name = "layer_01_base"
    base.scale = (40, 40, 1.0)
    base.data.materials.append(mat_silicon)
    base.parent = root_obj
    return base

def create_layer_02_crossbar():
    # We will create a combined mesh for the layer for better performance
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 2))
    layer = bpy.context.active_object
    layer.name = "layer_02_crossbar"
    layer.scale = (38, 38, 1)
    layer.data.materials.append(mat_crossbar)
    layer.parent = root_obj
    return layer

def create_layer_03_cnt_pillars():
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 4.5))
    layer = bpy.context.active_object
    layer.name = "layer_03_cnt_pillars"
    layer.scale = (36, 36, 3)
    layer.data.materials.append(mat_cnt_pillar)
    layer.parent = root_obj
    return layer

def create_layer_04_chs_shielding():
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 7))
    layer = bpy.context.active_object
    layer.name = "layer_04_chs_shielding"
    layer.scale = (36, 36, 2)
    layer.data.materials.append(mat_graphene)
    layer.parent = root_obj
    return layer

def create_layer_05_sot_mram():
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 9.5))
    layer = bpy.context.active_object
    layer.name = "layer_05_sot_mram"
    layer.scale = (34, 34, 3)
    layer.data.materials.append(mat_mram)
    layer.parent = root_obj
    return layer

def create_layer_06_dasm_registers():
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 12))
    layer = bpy.context.active_object
    layer.name = "layer_06_dasm_registers"
    layer.scale = (32, 32, 2)
    layer.data.materials.append(mat_sram)
    layer.parent = root_obj
    return layer

def create_layer_07_shadow_worker():
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 14))
    layer = bpy.context.active_object
    layer.name = "layer_07_shadow_worker"
    layer.scale = (30, 30, 1)
    layer.data.materials.append(mat_shadow)
    layer.parent = root_obj
    return layer

# Generate all layers
layers[1] = create_layer_01_base()
layers[2] = create_layer_02_crossbar()
layers[3] = create_layer_03_cnt_pillars()
layers[4] = create_layer_04_chs_shielding()
layers[5] = create_layer_05_sot_mram()
layers[6] = create_layer_06_dasm_registers()
layers[7] = create_layer_07_shadow_worker()

# --- Animation Setup ---
scene.frame_start = 0
scene.frame_end = 240

# Action 1: idle_rotate
action_idle = bpy.data.actions.new(name="idle_rotate")
root_obj.animation_data_create()
root_obj.animation_data.action = action_idle
# Rotate Z from 0 to 360 deg
fc = action_idle.fcurves.new(data_path="rotation_euler", index=2)
k1 = fc.keyframe_points.insert(frame=0, value=0.0)
k2 = fc.keyframe_points.insert(frame=240, value=2*math.pi)
k1.interpolation = 'LINEAR'
k2.interpolation = 'LINEAR'

# Make it an NLA track so it's exported
track_idle = root_obj.animation_data.nla_tracks.new()
track_idle.name = "idle_rotate_track"
track_idle.strips.new(name="idle_rotate", start=0, action=action_idle)
root_obj.animation_data.action = None # Clear active action

# Action 2: explode_view
# We animate each layer's Z position
action_explode = bpy.data.actions.new(name="explode_view")
# Layer original Zs
original_z = {
    1: 0.5,
    2: 2.0,
    3: 4.5,
    4: 7.0,
    5: 9.5,
    6: 12.0,
    7: 14.0
}
exploded_z = {
    1: 0.5,
    2: 5.0,
    3: 11.0,
    4: 18.0,
    5: 26.0,
    6: 35.0,
    7: 45.0
}

for idx, layer_obj in layers.items():
    layer_obj.animation_data_create()
    layer_action = bpy.data.actions.new(name=f"explode_layer_{idx}")
    fc_z = layer_action.fcurves.new(data_path="location", index=2)
    
    k1 = fc_z.keyframe_points.insert(frame=0, value=original_z[idx])
    k2 = fc_z.keyframe_points.insert(frame=60, value=exploded_z[idx])
    k1.interpolation = 'BEZIER'
    k2.interpolation = 'BEZIER'
    
    track_explode = layer_obj.animation_data.nla_tracks.new()
    track_explode.name = "explode_view"
    track_explode.strips.new(name=f"explode_view_{idx}", start=0, action=layer_action)

# Action 3: thermal_view
# This requires animating material parameters.
# In GLTF, animating material colors can be tricky, but we will add fcurves to the materials.
action_thermal = bpy.data.actions.new(name="thermal_view")

def animate_material_emission(mat, start_val, end_val, frame_end=40):
    mat.animation_data_create()
    mat_action = bpy.data.actions.new(name=f"thermal_{mat.name}")
    bsdf = get_principled_bsdf(mat)
    if not bsdf: return
    
    data_path = ""
    if 'Emission Strength' in bsdf.inputs:
        data_path = f'nodes["{bsdf.name}"].inputs["Emission Strength"].default_value'
    
    if data_path:
        fc = mat_action.fcurves.new(data_path=data_path)
        k1 = fc.keyframe_points.insert(frame=0, value=start_val)
        k2 = fc.keyframe_points.insert(frame=frame_end, value=end_val)
        k1.interpolation = 'BEZIER'
        k2.interpolation = 'BEZIER'
        
        track = mat.animation_data.nla_tracks.new()
        track.name = "thermal_view"
        track.strips.new(name=f"thermal_{mat.name}", start=0, action=mat_action)

animate_material_emission(mat_cnt_pillar, 0.4, 2.0)
animate_material_emission(mat_crossbar, 0.6, 1.5)

# --- Lighting ---
bpy.ops.object.light_add(type='AREA', radius=5, location=(15, -15, 20))
key_light = bpy.context.active_object
key_light.data.energy = 1000 # Blender 3+ area lights need higher energy to be visible (10W equivalent depends on scale)
key_light.data.color = hex_to_rgba("#00c8ff")[:3]

bpy.ops.object.light_add(type='AREA', radius=3, location=(-15, 10, 10))
fill_light = bpy.context.active_object
fill_light.data.energy = 300
fill_light.data.color = hex_to_rgba("#7f5af0")[:3]

bpy.ops.object.light_add(type='AREA', radius=4, location=(0, 20, -5))
rim_light = bpy.context.active_object
rim_light.data.energy = 500
rim_light.data.color = hex_to_rgba("#e8c547")[:3]

# --- Camera ---
bpy.ops.object.camera_add(location=(25, -25, 20))
cam = bpy.context.active_object
# Point camera to origin
from mathutils import Vector
direction = Vector((0, 0, 0)) - cam.location
rot_quat = direction.to_track_quat('-Z', 'Y')
cam.rotation_euler = rot_quat.to_euler()
cam.data.lens = 35 # 35mm FOV (42 deg)
# Depth of Field
cam.data.dof.use_dof = True
cam.data.dof.focus_object = layers[2]
cam.data.dof.aperture_fstop = 8.0

# Set as active camera
bpy.context.scene.camera = cam

# --- Export to GLB ---
output_path = bpy.path.abspath("//apux_model.glb")
print(f"Exporting GLB to: {output_path}")

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    export_animations=True,
    export_materials='EXPORT',
    export_colors=True,
    export_cameras=False,
    export_lights=False
)
print("Export complete!")

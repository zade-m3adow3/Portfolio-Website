BLENDER PYTHON SCRIPT SPECIFICATION — APU-X 3D Model

SCENE SETUP:
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.world.use_nodes = True
# Set world background to hex #05050c

MATERIALS NEEDED (create with nodes):
- mat_silicon: Principled BSDF, base color #1a1a2e, roughness 0.8, metallic 0.1
- mat_crossbar: Principled BSDF + Emission, base #00c8ff, emission strength 0.6
- mat_cnt_pillar: Glass BSDF blended with Emission #e8c547, transmission 0.4
- mat_graphene: Principled BSDF, base #1c1c2e, metallic 0.9, roughness 0.1
- mat_hbn: Principled BSDF, base #f0f0e0, transmission 0.2
- mat_mram: Principled BSDF + Emission, base #ff3864, emission 0.3
- mat_sram: Principled BSDF + Emission, base #0af5a0, emission 0.4
- mat_shadow: Principled BSDF, base #2a2a4e, roughness 0.6

LAYER CONSTRUCTION FUNCTIONS (create each as separate function):

def create_base_substrate():
    # bpy.ops.mesh.primitive_cube_add → scale (20, 20, 0.5) → mat_silicon
    # Add array modifier for surface grid lines using thin plane meshes
    pass

def create_crossbar_array():
    # Create single crossbar cell (cube 0.4×0.4×0.8) → mat_crossbar
    # Array modifier: count 16×16, offset 1.2 units X and Y
    # Add thin cylinder connectors between cells: bpy.ops.mesh.primitive_cylinder_add
    # radius=0.05, depth=1.2 → mat_graphene, duplicate across grid
    pass

def create_cnt_pillars():
    # Single CNT pillar: cylinder radius=0.075, height=3 → mat_cnt_pillar
    # Array: 8×8 grid
    # Interleave with flat disc (radius=0.8, height=0.15) alternating mat_graphene/mat_hbn
    # Stack 6 discs per pillar height with 0.5 unit spacing
    pass

def create_chs_layer():
    # Coaxial sleeve: outer cylinder radius=0.3 height=2 mat_graphene
    # inner cylinder (slightly smaller) radius=0.2 height=2 mat_hbn
    # Boolean difference for hollow interior
    # Array: 4×8 grid
    # Add vertex group for animated cross-section reveal
    pass

def create_sot_mram():
    # 4 rectangular blocks: cube scaled (8, 8, 1) each, 2×2 arrangement
    # mat_mram, slight Z-displacement from each other
    # Add data bus: thin cylinders connecting blocks, mat_crossbar
    pass

def create_dasm_registers():
    # 8 flat modules: cube scaled (8, 2, 0.5) each, stacked in 2×4 arrangement
    # mat_sram
    # Add connection lines to MRAM layer below
    pass

def create_shadow_worker():
    # Single tile: cube scaled (18, 18, 0.8) → mat_shadow
    # Surface detail: use texture image of circuit board pattern
    # Slight subdivision surface modifier for smooth edges
    pass

ANIMATION SETUP (NLA editor actions):

ACTION 1: "idle_rotate" (frames 0-240)
# Rotate entire APU-X collection around Z by 360° over 240 frames
# Use fcurve interpolation: LINEAR

ACTION 2: "explode_view" (frames 0-60)
# Each layer object: keyframe location.z at frame 0 (stacked), frame 60 (separated)
# Layer 1: z stays 0. Layer 2: z → 5. Layer 3: z → 11. Layer 4: z → 18.
# Layer 5: z → 26. Layer 6: z → 35. Layer 7: z → 45.
# Ease: use BEZIER interpolation with handles set to EASE_IN_OUT

ACTION 3: "thermal_view" (frames 0-40)
# Animate emission color of each material from base to thermal color
# CNT pillars: emission 0.4 → 2.0 (hottest)
# Crossbar: emission 0.6 → 1.5
# Base: metallic 0.1 → 0 (cooler)
# Use RGB driver on emission socket

EXPORT:
bpy.ops.export_scene.gltf(
    filepath='apux_model.glb',
    export_animations=True,
    export_materials='EXPORT',
    export_colors=True
)

LIGHTING:
- 3-point light setup:
  Key: Area light, 10W, position (15, -15, 20), color #00c8ff (cool key)
  Fill: Area light, 3W, position (-15, 10, 10), color #7f5af0 (purple fill)
  Rim:  Area light, 5W, position (0, 20, -5), color #e8c547 (gold rim)
- HDRI environment: solid dark (#05050c) with subtle gradient sphere

CAMERA:
position: (25, -25, 20), pointing at origin
FOV: 35mm lens equivalent (42°)
Depth of field: focus on layer 2 crossbar, f/8 equivalent

TECHNICAL NOTES for Three.js loading:
- Export each layer as separate mesh within same GLTF file, named: 
  'layer_01_base', 'layer_02_crossbar', etc.
- Animations exported as NLA tracks, accessible via AnimationMixer.
- Three.js code in apux.js should use gltfLoader.load() and then 
  create AnimationMixer, clone actions from animations array.

# Model intake standard

- Format: glTF 2.0 (`.glb` preferred); Draco may be used through the shared loader.
- Scale: playable character height is normalized to 1.6 world units.
- Forward axis: imported content is rotated so gameplay forward is `+X`.
- Materials: PBR metal/roughness; textures no larger than 1024×1024.
- Remove embedded lights, cameras, unused nodes and duplicate materials.
- Each model folder must include its source URL or generator, author, license and modification note.
- Keep each model under 2 MB where practical and consider Git LFS above 50 MB.

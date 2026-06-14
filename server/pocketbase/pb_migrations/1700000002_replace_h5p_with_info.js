/// <reference path="../pb_data/types.d.ts" />

/**
 * Replace `h5p` with `info` in ar_contents.type enum, drop the h5pPackage file field.
 * Info type stores rich HTML (Quill output) in the existing `body` field.
 * Rendered as a styled canvas → texture in AR.
 */
migrate(
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("ar_contents");

    // Update type enum — mutate in place (spreading SchemaField breaks Go marshaling)
    const typeField = collection.schema.getFieldByName("type");
    if (typeField) {
      typeField.options.values = ["text", "image", "model3d", "embed", "info"];
    }

    // Drop h5pPackage
    const h5p = collection.schema.getFieldByName("h5pPackage");
    if (h5p) collection.schema.removeField(h5p.id);

    return dao.saveCollection(collection);
  },
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("ar_contents");

    const typeField = collection.schema.getFieldByName("type");
    if (typeField) {
      typeField.options.values = ["text", "image", "model3d", "embed", "h5p"];
    }

    if (!collection.schema.getFieldByName("h5pPackage")) {
      collection.schema.addField(new SchemaField({
        "system": false,
        "name": "h5pPackage",
        "type": "file",
        "required": false,
        "options": { "maxSelect": 1, "maxSize": 41943040, "mimeTypes": [] }
      }));
    }

    return dao.saveCollection(collection);
  }
);

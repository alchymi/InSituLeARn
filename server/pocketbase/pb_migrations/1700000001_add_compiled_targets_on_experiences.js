/// <reference path="../pb_data/types.d.ts" />

/**
 * Add a `compiledTargets` file field on experiences.
 *
 * MindAR ne permet qu'un seul .mind par runtime. Quand l'éditeur publie une quête,
 * il compile côté navigateur toutes les sourceImage des targets en un .mind mergé,
 * et l'upload dans ce champ. L'apprenant charge directement ce fichier.
 */
migrate(
  (db) => {
    const dao = new Dao(db);
    const experiences = dao.findCollectionByNameOrId("experiences");

    experiences.schema.addField(new SchemaField({
      "system": false,
      "name": "compiledTargets",
      "type": "file",
      "required": false,
      "unique": false,
      "options": {
        "maxSelect": 1,
        "maxSize": 52428800,
        "mimeTypes": []
      }
    }));

    dao.saveCollection(experiences);
  },
  (db) => {
    const dao = new Dao(db);
    const experiences = dao.findCollectionByNameOrId("experiences");
    const field = experiences.schema.getFieldByName("compiledTargets");
    if (field) experiences.schema.removeField(field.id);
    dao.saveCollection(experiences);
  }
);

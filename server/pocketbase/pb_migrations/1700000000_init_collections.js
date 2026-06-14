/// <reference path="../pb_data/types.d.ts" />

/**
 * Initial schema for InSitu AR Learning POC.
 *
 * Hiérarchie : users → experiences → targets → ar_contents
 *
 * Self-register libre (users.createRule = "" → endpoint /api/collections/users/auth-with-password ouvert).
 * Public lit uniquement les expériences publiées + ressources liées.
 * Écriture scopée par chaîne createdBy.
 */
migrate(
  (db) => {
    const dao = new Dao(db);

    // ─────────────────────────────────────────────────────────
    // 1) Extend the built-in `users` collection with role
    //    (PB ships users with name, avatar by default — only add role)
    // ─────────────────────────────────────────────────────────
    const users = dao.findCollectionByNameOrId("users");

    users.schema.addField(new SchemaField({
      "system": false,
      "name": "role",
      "type": "select",
      "required": false,
      "unique": false,
      "options": { "maxSelect": 1, "values": ["admin", "editor"] }
    }));

    // Self-register libre (anyone may create their own user)
    users.createRule = "";
    // User can read/update only themselves; admin reads via admin auth
    users.listRule = "id = @request.auth.id";
    users.viewRule = "id = @request.auth.id";
    users.updateRule = "id = @request.auth.id";
    users.deleteRule = "id = @request.auth.id";

    dao.saveCollection(users);

    // ─────────────────────────────────────────────────────────
    // 2) experiences
    // ─────────────────────────────────────────────────────────
    const experiences = new Collection({
      "name": "experiences",
      "type": "base",
      "system": false,
      "schema": [
        {
          "name": "title",
          "type": "text",
          "required": true,
          "options": { "min": 1, "max": 200, "pattern": "" }
        },
        {
          "name": "slug",
          "type": "text",
          "required": true,
          "unique": true,
          "options": { "min": 2, "max": 80, "pattern": "^[a-z0-9][a-z0-9-]*$" }
        },
        {
          "name": "description",
          "type": "text",
          "required": false,
          "options": { "max": 2000 }
        },
        {
          "name": "cover",
          "type": "file",
          "required": false,
          "options": {
            "maxSelect": 1,
            "maxSize": 5242880,
            "mimeTypes": ["image/jpeg", "image/png", "image/webp"],
            "thumbs": ["400x300", "800x600"]
          }
        },
        {
          "name": "status",
          "type": "select",
          "required": true,
          "options": { "maxSelect": 1, "values": ["draft", "published", "archived"] }
        },
        {
          "name": "navigationMode",
          "type": "select",
          "required": true,
          "options": { "maxSelect": 1, "values": ["free", "sequential"] }
        },
        {
          "name": "isPublic",
          "type": "bool",
          "required": false
        },
        {
          "name": "publishedAt",
          "type": "date",
          "required": false,
          "options": { "min": "", "max": "" }
        },
        {
          "name": "createdBy",
          "type": "relation",
          "required": true,
          "options": {
            "collectionId": users.id,
            "cascadeDelete": false,
            "minSelect": 1,
            "maxSelect": 1
          }
        }
      ],
      "indexes": [
        "CREATE UNIQUE INDEX `idx_experiences_slug` ON `experiences` (`slug`)"
      ],
      "listRule":   "(status = 'published' && isPublic = true) || createdBy = @request.auth.id",
      "viewRule":   "(status = 'published' && isPublic = true) || createdBy = @request.auth.id",
      "createRule": "@request.auth.id != ''",
      "updateRule": "createdBy = @request.auth.id",
      "deleteRule": "createdBy = @request.auth.id"
    });
    dao.saveCollection(experiences);

    // ─────────────────────────────────────────────────────────
    // 3) targets
    // ─────────────────────────────────────────────────────────
    const targets = new Collection({
      "name": "targets",
      "type": "base",
      "system": false,
      "schema": [
        {
          "name": "experience",
          "type": "relation",
          "required": true,
          "options": {
            "collectionId": experiences.id,
            "cascadeDelete": true,
            "minSelect": 1,
            "maxSelect": 1
          }
        },
        {
          "name": "name",
          "type": "text",
          "required": true,
          "options": { "min": 1, "max": 120 }
        },
        {
          "name": "description",
          "type": "text",
          "required": false,
          "options": { "max": 1000 }
        },
        {
          "name": "sourceImage",
          "type": "file",
          "required": true,
          "options": {
            "maxSelect": 1,
            "maxSize": 8388608,
            "mimeTypes": ["image/jpeg", "image/png", "image/webp"],
            "thumbs": ["200x200", "600x600"]
          }
        },
        {
          "name": "compiledTarget",
          "type": "file",
          "required": true,
          "options": {
            "maxSelect": 1,
            "maxSize": 20971520,
            "mimeTypes": []
          }
        },
        {
          "name": "physicalWidthCm",
          "type": "number",
          "required": false,
          "options": { "min": null, "max": null, "noDecimal": false }
        },
        {
          "name": "order",
          "type": "number",
          "required": false,
          "options": { "noDecimal": true }
        },
        {
          "name": "isActive",
          "type": "bool",
          "required": false
        }
      ],
      "indexes": [
        "CREATE INDEX `idx_targets_experience` ON `targets` (`experience`)"
      ],
      "listRule":   "(experience.status = 'published' && experience.isPublic = true && isActive = true) || experience.createdBy = @request.auth.id",
      "viewRule":   "(experience.status = 'published' && experience.isPublic = true && isActive = true) || experience.createdBy = @request.auth.id",
      "createRule": "@request.auth.id != '' && experience.createdBy = @request.auth.id",
      "updateRule": "experience.createdBy = @request.auth.id",
      "deleteRule": "experience.createdBy = @request.auth.id"
    });
    dao.saveCollection(targets);

    // ─────────────────────────────────────────────────────────
    // 4) ar_contents
    // ─────────────────────────────────────────────────────────
    const arContents = new Collection({
      "name": "ar_contents",
      "type": "base",
      "system": false,
      "schema": [
        {
          "name": "experience",
          "type": "relation",
          "required": true,
          "options": {
            "collectionId": experiences.id,
            "cascadeDelete": true,
            "minSelect": 1,
            "maxSelect": 1
          }
        },
        {
          "name": "target",
          "type": "relation",
          "required": true,
          "options": {
            "collectionId": targets.id,
            "cascadeDelete": true,
            "minSelect": 1,
            "maxSelect": 1
          }
        },
        {
          "name": "type",
          "type": "select",
          "required": true,
          "options": {
            "maxSelect": 1,
            "values": ["text", "image", "model3d", "embed", "h5p"]
          }
        },
        {
          "name": "title",
          "type": "text",
          "required": false,
          "options": { "max": 200 }
        },
        {
          "name": "body",
          "type": "text",
          "required": false,
          "options": { "max": 4000 }
        },
        {
          "name": "media",
          "type": "file",
          "required": false,
          "options": {
            "maxSelect": 1,
            "maxSize": 20971520,
            "mimeTypes": ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "video/mp4"]
          }
        },
        {
          "name": "model3d",
          "type": "file",
          "required": false,
          "options": {
            "maxSelect": 1,
            "maxSize": 31457280,
            "mimeTypes": ["model/gltf-binary", "model/gltf+json", "application/octet-stream"]
          }
        },
        {
          "name": "h5pPackage",
          "type": "file",
          "required": false,
          "options": {
            "maxSelect": 1,
            "maxSize": 41943040,
            "mimeTypes": ["application/zip", "application/octet-stream", "application/x-zip-compressed"]
          }
        },
        {
          "name": "embedUrl",
          "type": "url",
          "required": false,
          "options": { "exceptDomains": [], "onlyDomains": [] }
        },
        { "name": "positionX", "type": "number", "options": { "noDecimal": false } },
        { "name": "positionY", "type": "number", "options": { "noDecimal": false } },
        { "name": "positionZ", "type": "number", "options": { "noDecimal": false } },
        { "name": "rotationX", "type": "number", "options": { "noDecimal": false } },
        { "name": "rotationY", "type": "number", "options": { "noDecimal": false } },
        { "name": "rotationZ", "type": "number", "options": { "noDecimal": false } },
        { "name": "scaleX",    "type": "number", "options": { "noDecimal": false } },
        { "name": "scaleY",    "type": "number", "options": { "noDecimal": false } },
        { "name": "scaleZ",    "type": "number", "options": { "noDecimal": false } },
        {
          "name": "actionType",
          "type": "select",
          "required": false,
          "options": {
            "maxSelect": 1,
            "values": ["none", "open_modal", "open_url", "next_step"]
          }
        },
        {
          "name": "actionValue",
          "type": "text",
          "required": false,
          "options": { "max": 500 }
        },
        {
          "name": "order",
          "type": "number",
          "required": false,
          "options": { "noDecimal": true }
        },
        {
          "name": "isVisible",
          "type": "bool",
          "required": false
        }
      ],
      "indexes": [
        "CREATE INDEX `idx_arcontents_target` ON `ar_contents` (`target`)",
        "CREATE INDEX `idx_arcontents_experience` ON `ar_contents` (`experience`)"
      ],
      "listRule":   "(experience.status = 'published' && experience.isPublic = true && isVisible = true) || experience.createdBy = @request.auth.id",
      "viewRule":   "(experience.status = 'published' && experience.isPublic = true && isVisible = true) || experience.createdBy = @request.auth.id",
      "createRule": "@request.auth.id != '' && experience.createdBy = @request.auth.id",
      "updateRule": "experience.createdBy = @request.auth.id",
      "deleteRule": "experience.createdBy = @request.auth.id"
    });
    dao.saveCollection(arContents);
  },
  (db) => {
    // Down — best-effort rollback
    const dao = new Dao(db);
    ["ar_contents", "targets", "experiences"].forEach((name) => {
      try {
        const c = dao.findCollectionByNameOrId(name);
        if (c) dao.deleteCollection(c);
      } catch (_) { /* ignore */ }
    });

    // Restore users to its built-in state (remove role + reset rules)
    try {
      const users = dao.findCollectionByNameOrId("users");
      const roleField = users.schema.getFieldByName("role");
      if (roleField) users.schema.removeField(roleField.id);
      users.createRule = null;
      users.listRule = "id = @request.auth.id";
      users.viewRule = "id = @request.auth.id";
      users.updateRule = "id = @request.auth.id";
      users.deleteRule = null;
      dao.saveCollection(users);
    } catch (_) { /* ignore */ }
  }
);

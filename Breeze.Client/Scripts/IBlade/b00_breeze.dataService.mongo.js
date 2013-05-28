﻿(function(factory) {
    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "breeze"
        factory(require("breeze"));
    } else if (typeof define === "function" && define["amd"] && !breeze) {
        // AMD anonymous module with hard-coded dependency on "breeze"
        define(["breeze"], factory);
    } else {
        // <script> tag: use the global `breeze` object
        factory(breeze);
    }    
}(function(breeze) {
       
    var core = breeze.core;

    var MetadataStore = breeze.MetadataStore;
    var JsonResultsAdapter = breeze.JsonResultsAdapter;
    var AbstractDataServiceAdapter = breeze.AbstractDataServiceAdapter;

    var ajaxImpl;

    var ctor = function () {
        this.name = "mongo";
    };
    ctor.prototype = new AbstractDataServiceAdapter();
    
    ctor.prototype._prepareSaveBundle = function(saveBundle, saveContext) {
        var em = saveContext.entityManager;
        var metadataStore = em.metadataStore;
        var helper = em.helper;
        var metadata = {};
        
        saveBundle.entities = saveBundle.entities.map(function (e) {
            var rawEntity = helper.unwrapInstance(e);
            var entityTypeName = e.entityType.name;
            var etInfo = metadata[entityTypeName];
            if (!etInfo) {
                dataProps = {};
                var dataProperties = e.entityType.dataProperties.map(function(dp) {
                     return { name: dp.nameOnServer, dataType: dp.dataType.name };
                });
                metadata[entityTypeName] = { dataProperties: dataProperties };
            }
            var originalValuesOnServer = helper.unwrapOriginalValues(e, metadataStore);
            var rawAspect = {
                entityTypeName: e.entityType.name,
                defaultResourceName: e.entityType.defaultResourceName,
                entityState: e.entityAspect.entityState.name,
                originalValuesMap: originalValuesOnServer
                
            };

            if (e.entityType.autoGeneratedKeyType !== AutoGeneratedKeyType.None) {
                rawAspect.autoGeneratedKey = {
                    propertyName: e.entityType.keyProperties[0].nameOnServer,
                    autoGeneratedKeyType: e.entityType.autoGeneratedKeyType.name
                };
            }
                
            rawEntity.entityAspect = rawAspect;
            return rawEntity;
        });

        saveBundle.metadata = metadata;
        saveBundle.saveOptions = { tag: saveBundle.saveOptions.tag };

        return saveBundle;
    }

    ctor.prototype._prepareSaveResult = function (saveContext, data) {
        
        var keyMappings = data.keyMappings.map(function (km) {
            return { entityTypeName: km.entityTypeName, tempValue: km.tempValue, realValue: km.realValue };
        });
        var entities = data.insertedEntities;
        var em = saveContext.entityManager;
        var updatedEntities = data.updatedKeys.map(function (uKey) {
            return em.getEntityByKey(uKey.entityTypeName, uKey.key);
        });
        Array.prototype.push.apply(entities, updatedEntities);
        var deletedEntities = data.deletedKeys.map(function (dKey) {
            return em.getEntityByKey(dKey.entityTypeName, dKey.key);
        });
        Array.prototype.push.apply(entities, deletedEntities);
        return { entities: entities, keyMappings: keyMappings, XHR: data.XHR };
    }
    
    ctor.prototype.jsonResultsAdapter = new JsonResultsAdapter({
        name: "mongo",

        visitNode: function (node, mappingContext, nodeContext) {
            return {};
        }
    });    
    
    breeze.config.registerAdapter("dataService", ctor);

}));
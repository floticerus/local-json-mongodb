/*
  local-json mongodb storage method v0.0.1
  copyright 2014 - kevin von flotow
  MIT license
*/
;( function ()
    {
        var MongoClient = require( 'mongodb' ).MongoClient

        var LocalJson = require( 'local-json' )

        module.exports = LocalJson.StorageMethod.define( 'mongodb', function ( storageMethod )
            {
                return function ( options )
                {
                    options = options || {}

                    // name of the collection in mongodb
                    options.collection = options.collection || 'local-json-data'

                    // attempt to use default client if one is not passed through options
                    //options.client = options.client || MongoClient.connect( 'mongodb://127.0.0.1:27017/local-json' )

                    var collection

                    if ( options.db )
                    {
                        collection = db.collection( options.collection )
                    }

                    else
                    {
                        MongoClient.connect( 'mongodb://127.0.0.1:27017/local-json', function ( err, db )
                            {
                                if ( err )
                                {
                                    return // errrrr
                                }

                                options.db = db

                                collection = db.collection( options.collection )

                                // call init manually since it will have failed previously
                                storageMethod.init()
                            }
                        )
                    }

                    // default ttl is 1 day
                    //options.ttl = typeof options.ttl !== 'undefined' ? parseInt( options.ttl ) : 86400

                    storageMethod.init = function ()
                    {
                        if ( !collection )
                        {
                            return
                        }

                        // prune data on start. this is probably not desired,
                        // since it wipes the cache every time a new server is created.
                        //
                        // but we need to do something because the file watcher
                        // cannot detect changes to files while node isn't running
                        collection.remove( {}, function ( err, removed )
                            {
                                options.db.ensureIndex( options.collection, 'path', { unique: true }, function ( err, index )
                                    {
                                        if ( err )
                                        {
                                            return console.log( err )
                                        }
                                    }
                                )
                            }
                        )
                    }

                    storageMethod.get = function ( filePath, done )
                    {
                        if ( !collection )
                        {
                            return done()
                        }

                        collection.findOne(
                            {
                                path: filePath
                            },

                            function ( err, result )
                            {
                                if ( err || !result )
                                {
                                    return done( err || 'not found' )
                                }

                                done( null, result.data )
                            }
                        )
                    }

                    storageMethod.set = function ( filePath, data, done )
                    {
                        if ( !collection )
                        {
                            return done()
                        }

                        collection.findAndModify(
                            {
                                path: filePath
                            },

                            [ '_id', 'asc' ],

                            {
                                $set:
                                {
                                    path: filePath,

                                    data: data
                                }
                            },

                            {
                                upsert: true
                            },

                            function ( err, result )
                            {
                                done( err )
                            }
                        )
                    }

                    storageMethod.remove = function ( filePath, done )
                    {
                        if ( !collection )
                        {
                            return done()
                        }

                        collection.remove(
                            {
                                path: filePath
                            },

                            function ( err )
                            {
                                done( err )
                            }
                        )
                    }

                    return storageMethod
                }
            }
        )
    }
)();

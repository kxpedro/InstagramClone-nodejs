var express = require('express');
var bodyParser = require('body-parser');
var mongodb = require('mongodb');
var ObjectID = require('mongodb').ObjectID;
var multiparty = require('connect-multiparty');
var fs = require('fs');
var fsx = require('fs-extra');

var app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(multiparty());
app.use(function(req, res, next){
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.setHeader("Access-Control-Allow-Credentials", true);

    next();
});

var port = 8080;

app.listen(port);
console.log('Servidor HTTP na Porta: ' + port);

//-

var db = new mongodb.Db(
    'instagram',
    new mongodb.Server('localhost', 27017, {}),
    {}
);

//-

app.get('/', function(req, res){
    res.send({msg: 'Olá'});
});
    
app.post('/api', function(req, res){
    var date = new Date();
    var time_stamp = date.getTime();

    var url_imagem = time_stamp + '_' + req.files.arquivo.originalFilename;
    var path_origem = req.files.arquivo.path;
    var path_destino = './uploads/' + url_imagem;    

    fsx.move(path_origem, path_destino, function(err){
        if(err){
            res.status(500).json({error: err});
            return;
        }else{
            var dados = {
                url_imagem: url_imagem,
                titulo: req.body.titulo
            }
            db.open(function(err, mongoclient){
                mongoclient.collection('postagens', function(err, collection){
                    collection.insert(dados, function(err, results){
                        if(err){
                            res.json({'status' : 'Erro'});
                        }else{
                            res.json({'status': 'Sucesso'});
                        }
                        mongoclient.close();
                    })
                })
            });
        }
    })
});

app.get('/api', function(req, res){
    db.open(function(err, mongoclient){
        mongoclient.collection('postagens', function(err, collection){
            collection.find().toArray(function(err, results){
                if(err){
                    res.json(err);
                }else{
                    res.json(results);
                }
                mongoclient.close();
            });
        })
    });
});

app.get('/api/:id', function(req, res){
    db.open(function(err, mongoclient){
        mongoclient.collection('postagens', function(err, collection){
            collection.find(ObjectID(req.params.id)).toArray(function(err, results){
                if(err){
                    res.json(err);
                }else{
                    res.json(results);
                }
                mongoclient.close();
            });
        })
    });
});

app.get('/uploads/:imagem', function(req, res){
    var img = req.params.imagem;    
    fs.readFile('./uploads/'+img, function(err, content){
        if(err){
            res.status(400).json(err);
            return;
        }else{            
            res.writeHead(200, {'content-type':'image/jpg'});
            res.end(content);
        }
    });
})

app.put('/api/:id', function(req, res){
    db.open(function(err, mongoclient){        
        mongoclient.collection('postagens', function(err, collection){
            collection.update(
                { _id: ObjectID(req.param.id)},
                { $push: { 
                        comentarios: {
                            id_comentario: new ObjectID(),
                            comentario: req.body.comentario                             
                        }
                    }
                },
                {},
                function(err, result){
                    if(err){
                        res.json(err);
                    }else{
                        res.json(result);
                    }
                    mongoclient.close();
                }
            );
        });
    })
});

app.delete('/api/:id', function(req, res){
    db.open(function(err, mongoclient){
        mongoclient.collection('postagens', function(err, collection){
            collection.remove({ _id: ObjectID(req.param.id)}, function(err, result){
                if(err){
                    res.json(err);
                }else{
                    res.json(result);
                }
                mongoclient.close(); 
            });
        });
    })
});


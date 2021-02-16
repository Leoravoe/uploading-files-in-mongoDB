// dependencies
const express = require('express')
const path = require('path')
const mongoose = require('mongoose')
const multer = require('multer')
const Grid = require('gridfs-stream')
const GridFsStorage = require('multer-gridfs-storage')
const crypto = require('crypto')
const methodOverride = require('method-override')
const bodyParser = require('body-parser')

// app config
const app = express();

// middleware
app.set('view engine', 'ejs')
app.use(bodyParser.json())
app.use(methodOverride('_method'))

// mongdb config
const mongoURI = process.env.DB_URI

const conn = mongoose.createConnection(mongoURI,{useNewUrlParser: true, useUnifiedTopology:true},()=>{
    console.log('Connected to db')
})

// initialize gfs 
let gfs
conn.once('open',()=>{
    gfs = Grid(conn.db,mongoose.mongo)
    gfs.collection('images')
})

const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'images'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

// routes

app.get('/', (req, res) => {
    res.render('index')
})
app.post('/upload',upload.single('file'),(req, res) => {
    console.log(req.file)
    res.json({file: req.file})
    // res.redirect('/')
})

app.get('/files',(req,res)=>{
  gfs.files.find().toArray((err,files)=>{
    if(!files || files.length === 0 ){
      return res.status(404).json({
        err: 'No files found'
      })
    }
    return res.json({files})
  })
})
app.get('/files/:filename',(req,res)=>{
  gfs.files.findOne({filename: req.params.filename},(err,file)=>{
    if(!file || file.length === 0 ){
      return res.status(404).json({
        err: 'No files found'
      })
    }
    return res.json(file)
  })
})
app.get('/image/:filename',(req,res)=>{
  gfs.files.findOne({filename: req.params.filename},(err,file)=>{
    if(!file || file.length === 0 ){
      return res.status(404).json({
        err: 'No files found'
      })
    }
    if(file.contentType === 'image/png' || file.contentType === 'image/jpeg'){
      const readStream = gfs.createReadStream(file.filename)
      readStream.pipe(res)
    }
  })
})
app.get('/pdf/:filename',(req,res)=>{
  gfs.files.findOne({filename: req.params.filename},(err,file)=>{
    // if(!file || file.length === 0 ){
    //   return res.status(404).json({
    //     err: 'No files found'
    //   })
    // }
    const readStream = gfs.createReadStream(file.filename)
    readStream.pipe(res)
  })
})
// listen

app.listen(5000, ()=>{
    console.log(`listening to port ${5000}`)
})
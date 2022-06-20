var mysql = require('mysql');
var fs = require('fs');
var qr = require('qr-image');
var canvasLib = require('canvas');
var cliProgress = require('cli-progress');

var progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

// Create a database connection
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'woonzorg'
});

// get adres and id from database
connection.query('SELECT woning.id, complex.adres, woning.huisnummer FROM complex INNER JOIN woning ON complex.id = woning.complex_id', async (error, results, fields) => {
    // handle error
    if (error) throw error;

    progress.start(results.length, 0);

    //loop through results
    for (var i = 0; i < results.length; i++) {

        // check if all our variables exist
        if (results[i].id == null || results[i].adres == null || results[i].huisnummer == null) {
            // skip this one
            progress.update(i + 1);
        } else {
            // remove illegal characters from adres for filename
            var filename = results[i].adres.replace(/[^a-zA-Z0-9]/g, '');

            //create qr directory
            if (!fs.existsSync('qr')) {
                fs.mkdirSync('qr');
            }

            //create directory for qr code if not exists
            if (!fs.existsSync('./qr/' + filename)) {
                fs.mkdirSync('./qr/' + filename);
            }

            // generate a qr code for each woning, with their respective id.
            var qrcode = qr.image(results[i].id, { type: 'png', size: 20 });
            let file = fs.createWriteStream('./qr/' + filename + '/' + results[i].huisnummer + '.png');
            let stream = qrcode.pipe(file);

            // wait for the stream to finish
            await new Promise((resolve, reject) => {
                stream.on('finish', resolve);
                stream.on('error', reject);
            });

            var filepath = './qr/' + filename + '/' + results[i].huisnummer + '.png';
            // get the image
            var image = await canvasLib.loadImage(filepath);
            // create a canvas
            var canvas = canvasLib.createCanvas(image.width, image.height);
            // create a context
            var ctx = canvas.getContext('2d');
            // draw the image
            ctx.drawImage(image, 0, 0);
            // scale the font size to fit the image based on the text length
            ctx.font = image.width / results[i].adres.length + 'px Arial';
            // put the directory name below the image in the canvas
            ctx.fillText(filename + " " + results[i].huisnummer, 5, image.height - 5);

            //create a promise to wait for the canvas to be saved
            var promise = new Promise((resolve, reject) => {
                canvas.toBuffer(function (err, buffer) {
                    if (err) {
                        console.log(err);
                    } else {
                        // save the buffer
                        fs.writeFile(filepath, buffer, function (err) {
                            if (err) {
                                console.log(err);
                            } else {
                                progress.increment();
                                // resolve the promise
                                resolve();
                            }
                        });
                    }
                });
            });

            // wait for the promise to finish
            await promise;
        }
    }

    //close connection
    connection.end();
    progress.stop();
});

// Canvas bootstrapping

var canvas = document.getElementById('editor');
var spriteRomData = null;

var scale = 10;
var width = 128;
var height = 256;

canvas.width = width * scale;
canvas.height = height * scale;

var ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

document.body.appendChild(canvas);

ctx.fillStyle = 'gray';
ctx.fillRect(0, 0, canvas.width, canvas.height);

var spriteCanvas = document.createElement('canvas');
spriteCanvas.width = width;
spriteCanvas.height = height;
var spriteCtx = spriteCanvas.getContext('2d');
spriteCtx.imageSmoothingEnabled = false;

var imageData = ctx.getImageData(0, 0, spriteCanvas.width, spriteCanvas.height);//ctx.getImageData(0, 0, canvas.width, canvas.height);
var data = imageData.data;

// Editor data 

var mapping = ['background', 'color1', 'color2', 'color3']

var palette = {
    background : {
        r: 68, 
        g: 47,
        b: 243,
        nes: '0x12'
    },
    color1 : { // rgb(248,56,0)
        r: 0,
        g: 0,
        b: 0,
        nes: '0x0F'
    },

    color2 : { // rgb(252,160,68)
        r: 105,
        g: 105,
        b: 105,
        nes: '0x00'

    },

    color3 : { //rgb(172,124,0)
        r: 255,
        g: 255,
        b: 255,
        nes: '0x20'
    }
}

var selectedPalette = 'background';
var selectedColor = null;
var selectedNes = null;

var showGridLines = true;

var elements = document.getElementsByClassName('selectable');

document.getElementById('grid').addEventListener('change', toggleGrid);

function toggleGrid(evt){
    showGridLines = !showGridLines;
    paintCanvas();
}

var downloadNes = document.getElementById('nes')
downloadNes.addEventListener('click', function(){
    var name = document.getElementById('nesfilename').value;
    spriteRomData = canvasToNES(imageData);
    download(name || 'sprite.ppf', spriteRomData, 'octect/stream');
});

var uploadNes = document.getElementById('nesfile')
uploadNes.addEventListener('change', function(){
    readBlob()
}, false);

var newSheet = document.getElementById('new');
newSheet.addEventListener('click', function(){
    spriteRomData = new Uint8Array(512*16);
    NEStoCanvas(spriteRomData);
});

var savePng = document.getElementById('image');
savePng.addEventListener('click', function(){
    var image = canvas.toDataURL("image/png");
    download(name || 'sprite.png', image, 'image/png');
});

var grid = document.getElementById('grid');
grid.addEventListener('change', toggleGrid);

for(var el of elements){
    el.addEventListener('mouseup', handlePaletteChange);
}

function handlePaletteChange(evt){
    if(evt.target.dataset.palette){
            selectedPalette = evt.target.dataset.palette;
            
        }

        if(evt.target.dataset.nes){
            selectedColor = evt.target.style.backgroundColor;
            selectedNes = evt.target.dataset.nes;
        }

        if(selectedColor && selectedPalette){
            // save the current state of teh rom before switching palettes
            spriteRomData = canvasToNES(imageData);

            var color = selectedColor.match(/(\d{1,3})\,\s*(\d{1,3})\,\s*(\d{1,3})/);
            palette[selectedPalette].r = color[1];
            palette[selectedPalette].g = color[2];
            palette[selectedPalette].b = color[3];
            palette[selectedPalette].nes = selectedNes;

            // draw the rom with the new pallet data
            NEStoCanvas(spriteRomData);
            
            selectedColor = null;
            selectedNes = null;
        }
        updatePallet();
}

// Handle hotkeys
window.addEventListener('keydown', function(evt){
    if(evt.keyCode == 49){
        selectedPalette = 'background'
    }

    if(evt.keyCode == 50){
        selectedPalette = 'color1'
    }

    if(evt.keyCode == 51){
        selectedPalette = 'color2'
    }
    
    if(evt.keyCode == 52){
        selectedPalette = 'color3'
    }
    updatePallet();
});

function setElementColor(elementId, r, g, b){
    document.getElementById(elementId).style.backgroundColor = 'rgb('+r+','+g+','+b+')';
}

function getColorLuminance(color) {
    return (color.r * 0.2126) + (color.g * 0.7152) + (color.b * 0.0722);
}

function getWhiteOrBlack(color){
    return getColorLuminance(color) > .1 ? 'black' : 'white';
}

function updatePallet(){
    var bgColor = palette.background;
    var c1 = palette.color1;
    var c2 = palette.color2;
    var c3 = palette.color3;
    
    setElementColor('brush',  palette[selectedPalette].r,  palette[selectedPalette].g,  palette[selectedPalette].b);
    setElementColor('background', bgColor.r, bgColor.g, bgColor.b);
    setElementColor('color1', c1.r, c1.g, c1.b);
    setElementColor('color2', c2.r, c2.g, c2.b);
    setElementColor('color3', c3.r, c3.g, c3.b);

    document.getElementById('current').textContent = 'Palette String: ' + [bgColor.nes, c1.nes, c2.nes, c3.nes].join(', ').replace(/0x/g, 'PAL');

    document.getElementById('brush').style.color = getWhiteOrBlack(palette[selectedPalette]);
    document.getElementById('background').style.color = getWhiteOrBlack(bgColor);
    document.getElementById('color1').style.color = getWhiteOrBlack(c1);
    document.getElementById('color2').style.color = getWhiteOrBlack(c2);
    document.getElementById('color3').style.color = getWhiteOrBlack(c3);
}
updatePallet();


function getXY(evt){
    // ref: https://stackoverflow.com/questions/28633221/document-body-scrolltop-firefox-returns-0-only-js
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
    var x = Math.floor((evt.x - evt.target.offsetLeft) / scale);
    var y = Math.floor((evt.y - evt.target.offsetTop + scrollTop) / scale);
    return {
        x: x,
        y: y
    }
}

document.getElementById('editor').addEventListener('mousemove', function(evt){
    var coords = getXY(evt);
    document.getElementById('coord').innerText = 'Pixel (' + coords.x + ', ' + coords.y + ')';

    var ycoord = Math.floor((coords.y/8)) * 16;
    var tile = Math.floor((coords.x) / 8 + ycoord).toString().toUpperCase();
    if(tile.length < 2){
        tile = '0' + tile;
    }

    document.getElementById('tile').innerText = 'Tile ' + tile;
    if(_isMouseDown){
        handleDrawTool(evt);
    }
    paintCanvas();
    drawCurrentPixelSelected(coords.x, coords.y);
    
});
document.getElementById('editor').addEventListener('mousedown', down)
document.getElementById('editor').addEventListener('mouseup', up)
var _isMouseDown = false;
function down(evt){
    _isMouseDown = true;
    handleDrawTool(evt);
}
function up(evt) {
    _isMouseDown = false;
    
}

function handleDrawTool(evt){
    var coords = getXY(evt);
    putPixel(coords.x, coords.y, palette, selectedPalette, imageData);
    paintCanvas();
}

/// Drawing utilities

function putPixel(x, y, palette, paletteColor, imageData) {
    var canvasImageOffset = (x  + imageData.width * y) * 4;
    var color = palette[paletteColor];
    imageData.data[canvasImageOffset + 0] = color.r;
    imageData.data[canvasImageOffset + 1] = color.g;
    imageData.data[canvasImageOffset + 2] = color.b;
}

function getPixel(x, y, imageData) {
    var canvasImageOffset = (x  + imageData.width * y) * 4;
    var color = {
        r: imageData.data[canvasImageOffset + 0],
        g: imageData.data[canvasImageOffset + 1],
        b: imageData.data[canvasImageOffset + 2]
    };

    if(!color){
        throw new Error("Invalid pixel (" + x + ", " + y + ")");
    }

    return color;
}

function drawSpriteBorderGridLines(){

    var sWidth = canvas.width / 16;
    var sHeight = canvas.height / 32;
    
    //ctx.save();
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = 2;
    for(var x = 0; x < 15; x++){
        ctx.beginPath()
        ctx.moveTo(x * sWidth + sWidth, 0);
        ctx.lineTo(x * sWidth + sWidth, canvas.height);
        ctx.stroke();
    }
    for(var y = 0; y < 31; y++){
        ctx.beginPath();
        ctx.moveTo(0, y * sHeight + sHeight)
        ctx.lineTo(canvas.width, y * sHeight + sHeight)
        ctx.stroke();
    }
    
    //ctx.restore();
}

function drawCurrentPixelSelected(x, y){
    var pWidth = canvas.width / 128;
    var pHeight = canvas.height / 256;


    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = 2;
    ctx.beginPath()
    ctx.strokeRect(x * scale, y * scale, pWidth, pHeight);
    ctx.stroke();
}

function paintCanvas(){
    spriteCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(spriteCanvas, 0, 0, width * scale, height * scale);
    if(showGridLines){
        drawSpriteBorderGridLines();
    }
}


function rgbColorToPaletteTuple(color, palette) {
    if(!color){
        throw new Error("Invalid color for current palette! - " + colorKey(color));
    }
    function colorKey(color){
        return color.r + '+'+ color.g + '+' + color.b;
    }
    var paletteHash = {};
    paletteHash[colorKey(palette.background)] = [0x0, 0x0];
    paletteHash[colorKey(palette.color1)] = [0x1, 0x0];
    paletteHash[colorKey(palette.color2)] = [0x0, 0x1];
    paletteHash[colorKey(palette.color3)] = [0x1, 0x1];

    var result = paletteHash[colorKey(color)];
    
    return result;
}

/// Translate raw NES binary to a canvas

function NEStoCanvas(byteArray){
    var xpos = 0;
    var ypos = 0;
    // every sprite is 16 bytes
    // 1 byte is 8 pixels 
    // byte n and byte n+8 control the color of that pixel
    //  (0,0) background
    //  (1,0) color 1
    //  (0,1) color 2
    //  (1,1) color 3
    for(var b = 8; b < byteArray.length; b+=16){
        ypos = Math.floor(b/height) * 8
        // draw sprite
        for(var i = 0; i < 8; i++){
            for(var j = 7; j >= 0; j--){
                var mask = 0x1;

                var channel1 = byteArray[b + i];

                var channel2 = byteArray[b + i + 8];

                var color = ((channel1 >>> j) & mask) + (((channel2 >>> j) & mask) << 1)

                putPixel(xpos + (7 - j), ypos + i, palette, mapping[color], imageData);
            }            
        }        
        xpos = (xpos + 8) % width;
    }
    
    paintCanvas();
}

/// Translate raw canvas pixles to NES Binary

function canvasToNES(imageData){
    // move 16 byte sprite and 512 sprites
    var byteArray = new Uint8Array(512 * 16);
    //var PPFData = new Uint8Array(8);
    byteArray[0] = 0x50;
    byteArray[1] = 0x50;
    byteArray[2] = 0x46;
    byteArray[3] = 0x76;
    byteArray[4] = 0x01;
   	byteArray[5] = 0x00;
    byteArray[6] = 0x00;
	  byteArray[7] = 0x00;

    // tuple buffer
    var tupleBuffer = new Array(imageData.width * imageData.height);


    for(var y = 0; y < imageData.height; y++){
        for(var x = 0; x < imageData.width; x++){        
            // extract which color it is from imageData
            var color = getPixel(x, y, imageData);

            // find the pallet color
            var palletTuple = rgbColorToPaletteTuple(color, palette);

            // write it to the tupleBuffer
            tupleBuffer[x + imageData.width * y] = palletTuple
        }
    }
    
    
    // tuple buffer has imageData.width * imageData.heigh pixels, so divide that by 16 for sprites
    var xtotal = 0;
    var ytotal = 0;
    for(var i = 8; i < byteArray.length; i+=8) {
        ytotal = Math.floor(i/height) * 8
        
        
        for(var y = ytotal; y < (ytotal + 8); y++){
            // do each row channel
            var byteChannel1 = 0x00;
            var byteChannel2 = 0x00;

            // complete row calculation
            for(var x = xtotal; x < (xtotal + 8); x++){
                var tup = tupleBuffer[x + y * imageData.width];
                byteChannel1 = (byteChannel1 << 1 | tup[0]);
                byteChannel2 = (byteChannel2 << 1 | tup[1]);
            }
            // write calc'd row channels to appropriate byte locations
            byteArray[i] = byteChannel1;
            byteArray[i+8] = byteChannel2
            i++;
        }

        xtotal = (xtotal + 8) % width;
    }

    return byteArray;
}


/// Download utilities

function download(filename, byteArray, type) {
    // convert to a blob
    var blob = new Blob([byteArray], {type: type});
    if(type == 'octect/stream'){
        var url = window.URL.createObjectURL(blob);
    } else {
        var url = byteArray;
    }

    var pom = document.createElement('a');
    pom.setAttribute('href', url);
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}

/// Upload utilities

function readBlob() {

    var files = document.getElementById('nesfile').files;
    if (!files.length) {
        alert('Please select a file!');
        return;
    }

    var file = files[0];
    var start = 0;
    var stop = file.size - 1;

    var reader = new FileReader();

    // If we use onloadend, we need to check the readyState.
    reader.onloadend = function(evt) {
        
        if (evt.target.readyState == FileReader.DONE) { // DONE == 2
            spriteRomData = new Uint8Array(evt.target.result);
            NEStoCanvas(spriteRomData);
        }
    };

    var blob = file.slice(start, stop + 1);
    reader.readAsArrayBuffer(blob);
}


/// Load up default sprite sheet

var xhr = new XMLHttpRequest();
xhr.open('GET', 'main.ppf')
xhr.responseType = 'arraybuffer';

xhr.addEventListener('load', function(evt){
    spriteRomData = new Uint8Array(xhr.response);
    NEStoCanvas(spriteRomData);
});

xhr.send();

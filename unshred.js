/*globals document,Math*/

var UNSHRED = (function(){
    'use strict';

    var u = {},
    canvas = document.getElementById("scrambled"),
    new_canvas = document.getElementById("unscrambled"),
    img = document.getElementById("scrambled-img"),
    STRIP_WIDTH = 32,

    get_pixel = function(data,x,y){
        // returns [r,g,b,a] of that pixel
        var pos = ( y * data.width + x ) * 4;
        return [ data.data[pos], data.data[pos+1], data.data[pos+2], data.data[pos+3] ];
    },

    col_difference = function(c1,c2){
        // difference between two colours, as described at:
        // http://en.wikipedia.org/wiki/RGB_color_model#Geometric_representation
        // except I don't bother with the sqrt in the euclidean distance.
        return Math.pow(c1[0]-c2[0],2) + Math.pow(c1[1]-c2[1],2) + Math.pow(c1[2]-c2[2],2) + Math.pow(c1[3]-c2[3],2);
    },

    col_average = function(cs){
        // average colour of a number of pixels
        var i,r=0,g=0,b=0,a=0;
        for (i=0; i<cs.length; i++){
            r += cs[i][0];
            g += cs[i][1];
            b += cs[i][2];
            a += cs[i][3];
        }
        return [r/cs.length, g/cs.length, b/cs.length, a/cs.length];
    },

    get_block_avg_col = function(data,x,y,size){
        // average color of a square block with radius size, centered at (x,y)
        var i,j,cols=[];
        for (i=-size; i<=size; i++){
            for (j=-size; j<=size; j++){
                cols.push( get_pixel(data,x+i,y+j) );
            }
        }
        return col_average(cols);
    },

    get_score = function(data,s1,s2){
        // returns a number indicating how close a match strips 1 & 2 are
        // (with s1 left of s2) - lower score means a better match
        var i, score=0, chunk=3, block=1;
        for (i=0; i<data.height-chunk; i+=1){
            score += col_difference(
                get_block_avg_col(data, s1*STRIP_WIDTH+31-block, i+block, block),
                get_block_avg_col(data, s2*STRIP_WIDTH   +block, i+block, block)
            );
        }
        return score;
    },

    draw_solution = function(old_data,order){
        var ctx = new_canvas.getContext("2d"),
        new_data = ctx.createImageData(img.width, img.height),
        i,j,index,order_i,order_idx;

        new_canvas.width = img.width;
        new_canvas.height = img.height;

        for (j=0; j<img.height; j++){
            for (i=0; i<img.width; i++){
                index = 4*(j*img.width+i);

                order_i   = order[Math.floor(i/STRIP_WIDTH)] * STRIP_WIDTH + i%STRIP_WIDTH;
                order_idx = 4*(j*img.width+order_i);

                new_data.data[index    ] = old_data.data[order_idx    ];
                new_data.data[index + 1] = old_data.data[order_idx + 1];
                new_data.data[index + 2] = old_data.data[order_idx + 2];
                new_data.data[index + 3] = old_data.data[order_idx + 3];
            }
        }

        ctx.putImageData(new_data,0,0);
    };

    u.go = function(){
        var ctx = canvas.getContext("2d"),
        img_data,
        strip_matches = [],
        i,j,
        strips = img.width/STRIP_WIDTH,
        ordered, last_ordered,
        best_r_match, best_l_match,
        best_r_score, best_l_score;

        // copy image to canvas (image is display:none)
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // get pixel data
        // fails due to XSS restriction if image is not inline :(
        img_data = ctx.getImageData(0,0,img.width,img.height);

        // compare each strip to every other strip, make a matrix of
        // how likely they are to go next to each other
        for (i=0; i<strips; i++){
            strip_matches[i] = [];
            for (j=0; j<strips; j++){
                if (i===j){
                    strip_matches[i][j] = Infinity;
                } else {
                    strip_matches[i][j] = get_score(img_data,i,j);
                }
            }
        }

        // starting with strip 0, find the most likely strip to be to its right and left
        // chose the best of those two, put them together, and repeat
        ordered = [0];

        while(ordered.length < strips){
            last_ordered = ordered[ordered.length-1];

            best_r_match = last_ordered;
            best_r_score = Infinity;

            best_l_match = ordered[0];
            best_l_score = Infinity;

            for (i=0; i<strips; i++){
                if (ordered.indexOf(i) === -1){
                    if ( best_r_score > strip_matches[last_ordered][i] ){
                        best_r_match = i;
                        best_r_score = strip_matches[last_ordered][i];
                    }
                    if ( best_l_score > strip_matches[i][ordered[0]] ){
                        best_l_match = i;
                        best_l_score = strip_matches[i][ordered[0]];
                    }
                }
            }

            if ( best_l_score < best_r_score ){
                ordered.unshift(best_l_match);
            } else {
                ordered.push(best_r_match);
            }
        }

        draw_solution(img_data,ordered);
    };

    return u;
}());

(function(){
    'use strict';
    document.getElementById("scrambled-img").onload = function(){
        UNSHRED.go();
    };
}());
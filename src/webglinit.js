
function webGLinit()
{
    var elem = document.body;
    var params = { width: 285, height: 200, type: Two.Types.webgl };
    var two = new Two(params).appendTo(elem);

    var circle = two.makeCircle(72, 100, 50);
    var rect = two.makeRectangle(213, 100, 100, 100);


    circle.fill = '#FF8000';
    circle.stroke = 'black';
    circle.linewidth = 1;

    rect.fill = 'rgb(0, 200, 255)';
    rect.opacity = 0.75;
    rect.noStroke();


    two.update();
}

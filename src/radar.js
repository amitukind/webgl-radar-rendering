function renderJSON(radar_JSON)
{
    console.log("I have got data to render");
    console.log(radar_JSON);
    console.log(radar_JSON.meters_to_first_gate);
    //radar_JSON.radius = 3000;
    var scaleFactor = 100;

    var center = {x:parseInt(radar_JSON.radius)/scaleFactor, y:parseInt(radar_JSON.radius)/scaleFactor}
    var colorCodes = ["#464A4C","#4B4E50","#515556","#55595C","#595E61","#5E6366","#646B6D","#6D7376","#767B7E","#7D8284","#818688","#878D8F","#8F9597","#979C9F","#9EA4A6","#A6ACAF","#AEB5B7","#B4BABB","#C1BFC8","#88E57E","#6CE85E","#68D75C","#62CA57","#5BBB50","#52A948","#4EA045","#46913D","#3E8237","#387331","#30662B","#3C622A","#5D7434","#849C39","#D1BE00","#FDE300","#FFE000","#FFDA00","#FFD400","#FFCC00","#FFBC00","#FFA100","#FF8A00","#FF8400","#FF7C00","#FF7400","#FF6C00","#FF6200","#FF5500","#FF4A00","#FF3A00","#FE1800","#FA0304","#F30105","#E80205","#DC0104","#D20004","#C7010B","#BD011D","#B40036","#A10091","#A000C5","#AB00D1","#B900D7","#C500DE","#D001E4","#DB03EA","#E506EF","#F008F5","#FF04FA","#33CEFE","#00EFFF","#00DAFF","#00CEFF","#00C7FF","#00C2FF","#00B8FF","#00ACFF","#0098FF","#158FF0","#BCB589","#FFCF68","#FFD68D","#FFDFA4","#FFE3B1","#FFE8BE"];

    var elem = document.body;
    var params = { width: parseInt(radar_JSON.radius)*2/scaleFactor, height: parseInt(radar_JSON.radius)*2/scaleFactor, type: Two.Types.svg };
    var two = new Two(params).appendTo(elem);

    var outerBoundary = two.makeCircle(center.x, center.y, parseInt(radar_JSON.radius)/scaleFactor);
    outerBoundary.stroke = 'black';
    outerBoundary.linewidth = 1;

    var innerBoundary = two.makeCircle(parseInt(radar_JSON.radius)/scaleFactor, parseInt(radar_JSON.radius)/scaleFactor, parseInt(radar_JSON.meters_to_first_gate)/scaleFactor);
    innerBoundary.stroke = 'black';
    innerBoundary.linewidth = 1;



    two.update();

}

function pointOnCircle(r, angle)
{

}
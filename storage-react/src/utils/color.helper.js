
export const getColor = (color, colorOpacity = 0) => {
  // https://htmlcolorcodes.com/
  const colors = {
    "red": "rgba(255,0,0," + colorOpacity + ")",
    "red_light": "rgba(241, 148, 138," + colorOpacity + ")",
    "red_mid": "rgba(203, 67, 53," + colorOpacity + ")",
    "red_dark": "rgba(148, 49, 38," + colorOpacity + ")",
    "green_dark": "rgba(0,102,51," + colorOpacity + ")",
    "green_light": "rgba(0,255,0," + colorOpacity + ")",
    "green_mid": "rgba(46, 204, 113," + colorOpacity + ")",
    "greenish_light": "rgba(118, 215, 196," + colorOpacity + ")",
    "greenish_dark": "rgba(20, 143, 119 ," + colorOpacity + ")",
    "blue_dark": "rgba(0,102,204," + colorOpacity + ")",
    "blue_light": "rgba(153,255,255," + colorOpacity + ")",
    "violet": "rgba(102,0,204," + colorOpacity + ")",
    "violet_light": "rgba(175,122,197," + colorOpacity + ")",
    "orange": "rgba(255,128,0," + colorOpacity + ")",
    "orange_light": "rgba(237, 187, 153," + colorOpacity + ")",
    "orange_dark": "rgba(186, 74, 0," + colorOpacity + ")",
    "yellow_dark": "rgba(255,255,0," + colorOpacity + ")",
    "yellow_light": "rgba(255,255,204," + colorOpacity + ")",
    "purple": "rgba(255,51,255," + colorOpacity + ")",
    "white": "rgba(255,255,255," + colorOpacity + ")",
    "gray_dark": "rgba(96,96,96," + colorOpacity + ")",
    "gray_light": "rgba(192,192,192," + colorOpacity + ")",
    "pink": "rgba(255,153,204," + colorOpacity + ")",
    "khaki": "rgba(240, 230, 140," + colorOpacity + ")",
    "khaki_dark": "rgba(189,183,107," + colorOpacity + ")",
  }

  return colors[color];
}

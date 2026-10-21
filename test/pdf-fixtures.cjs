const viewport = { width: 600, height: 800 };
const item = (str, x, y, fontName = 'body', size = 12) =>
  ({ str, width: str.length * 5, height: size, fontName, transform: [size,0,0,size,x,y] });
function fixture() {
  const items = [item('A generic equation follows.',40,740),
    item('k',210,718,'italic',8),
    item('y',180,700,'italic'),item('\u0d4c \u0dcd',195,700,'encoded'),item('z',225,700,'italic'),
    item('j',200,686,'italic',8),item('\u0b40',210,686,'encoded',8),item('0',218,686,'body',8),
    item('(9)',290,675),item('a',200,665,'italic'),item('y',180,650,'italic'),
    item('\u0d4c \u0da8',195,650,'encoded'),item('b',220,650,'italic'),
    item('For',40,610),item('q',65,610,'italic'),item('\u0d4c',75,610,'encoded'),item('2',85,610),item('the result holds.',100,610),
    item('Compare',40,590),item('\u03b1',85,590,'greek'),item('\u0d51',95,590,'encoded'),item('\u03b2',105,590,'greek'),
    item('and',120,590),item('\u123a',145,590,'encoded'),item('1',155,590),item('\u0d46',165,590,'encoded'),item('q',175,590,'italic'),item('\u123b',185,590,'encoded'),item('r',195,590,'italic'),
    item('Ordinary ending.',40,560)];
  items[0].width=450;items.at(-1).width=450;
  return items;
}

module.exports = { fixture, item, viewport };

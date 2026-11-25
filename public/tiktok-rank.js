/* Wertungen: echte Rangfolgen mit Quelle. Der Schlechteste scheidet zuerst aus, der Beste gewinnt.
   items: [Name, Wert] in Reihenfolge der Quelle (bei gleichen Werten gilt diese Reihenfolge).
   Namen haben hoechstens 16 Zeichen. div/dec/unit bestimmen die Anzeige des Wertes. */
window.TT_RANK = {
 'Automarken':[
  {id:'welt',name:'Weltweit am besten verkauft 2024',q:'Welche Automarke wurde 2024 weltweit am besten verkauft?',src:'Focus2Move, Jahr 2024',unit:'Mio. Autos',div:1,dec:2,items:[['Toyota',9.09],['VW',4.93],['BYD',3.80],['Honda',3.74],['Ford',3.69],['Hyundai',3.69],['Nissan',3.13],['Chevrolet',3.03],['Kia',2.91],['Mercedes',2.18]]},
  {id:'de',name:'In Deutschland neu zugelassen 2024',q:'Welche Automarke wurde 2024 in Deutschland am häufigsten neu zugelassen?',src:'KBA, Jahr 2024',unit:'Neuwagen',div:1,dec:0,items:[['VW',536888],['Mercedes',257888],['BMW',232886],['Skoda',205593],['Audi',202317],['Seat',152334],['Opel',147833],['Ford',99554],['Hyundai',96365],['Toyota',95474],['Dacia',71424],['Kia',68656],['Peugeot',67454],['Porsche',36097],['Mini',32571],['Smart',12463]]}
 ],
 'Konsolen':[
  {id:'verkauf',name:'Am häufigsten verkauft (alle Zeit)',q:'Welche Konsole wurde insgesamt am häufigsten verkauft?',src:'Wikipedia, Herstellerangaben',unit:'Mio. verkauft',div:1,dec:1,items:[['PlayStation 2',160],['Nintendo Switch',156.59],['Nintendo DS',154.02],['Game Boy',118.69],['PlayStation 4',117.2],['PlayStation 1',102.49],['Wii',101.63],['PlayStation 5',95.3],['PlayStation 3',87.4],['Xbox 360',84],['Game Boy Advance',81.51],['PSP',80],['Nintendo 3DS',75.94],['NES',61.91],['Xbox One',58],['Super Nintendo',49.1],['Xbox Series X',35],['Nintendo 64',32.93],['Mega Drive',30.75],['Atari 2600',30],['Xbox',24],['GameCube',21.74],['PS Vita',16],['Wii U',13.56],['Dreamcast',9.13]]}
 ],
 'Städte in Deutschland':[
  {id:'einw',name:'Meiste Einwohner (Ende 2023)',q:'Welche deutsche Stadt hat die meisten Einwohner?',src:'Statistisches Bundesamt, 31.12.2023',unit:'Einwohner',div:1,dec:0,items:[['Berlin',3782202],['Hamburg',1910160],['München',1510378],['Köln',1087353],['Frankfurt',775790],['Stuttgart',633484],['Düsseldorf',631217],['Leipzig',619879],['Dortmund',595471],['Essen',586608],['Bremen',577026],['Dresden',566222],['Hannover',548186]]}
 ],
 'Länder':[
  {id:'einw',name:'Meiste Einwohner (Schätzung 2026)',q:'Welches Land hat die meisten Einwohner?',src:'UN World Population Prospects 2024',unit:'Mio. Einwohner',div:1000000,dec:1,items:[['Indien',1476625576],['China',1412914089],['USA',349035494],['Brasilien',213562666],['Russland',143394458],['Mexiko',132997658],['Japan',122427731],['Ägypten',120101175],['Türkei',87926082],['Deutschland',83644258],['UK',69931528],['Frankreich',66746401],['Italien',58926166],['Südkorea',51600388],['Spanien',47850793],['Argentinien',46003734],['Kanada',40467728],['Marokko',38762441],['Polen',37843188],['Australien',27227096],['Niederlande',18448775],['Belgien',11774642],['Schweden',10701047],['Portugal',10395362],['Griechenland',9897115],['Österreich',9107266],['Schweiz',9007798],['Norwegen',5652989],['Kroatien',3822345],['Island',402329]]}
 ]
};

/* script.js — Real Scents, donker/goud luxe thema */
const WHATSAPP_NUMBER = "+32467839407"; // zet jouw nummer
const FALLBACK_IMG = "https://assets.codepen.io/15351970/blank-white.webp";
const PAGE_SIZE = 20;

// 1) Catalogus hardcoded (gebruik jouw volledige lijst hieronder)
const RAW_LIST = `


Amouge | Guidance | 69.99 | https://assets.codepen.io/15351970/photo-output_11.jpeg
 
Ex Nihilo | Fleur narcotique edp | 69.99 | https://assets.codepen.io/15351970/IMG_5146.webp
Ex Nihilo | Fleur narcotique extrait | 69.99 | https://assets.codepen.io/15351970/IMG_5147.jpeg
 
Nishane | Hacivat | 69.99 | https://assets.codepen.io/15351970/IMG_5148.webp
Nishane | Karagoz | 69.99 | https://assets.codepen.io/15351970/IMG_5149.webp
 
Azzaro | The most wanted parfum | 49.99 | https://assets.codepen.io/15351970/IMG_5150.jpeg
Azzaro | Azzaro Wanted Classic | 49.99 | https://assets.codepen.io/15351970/IMG_5187.jpeg
Azzaro | By nights | 49.99 | https://assets.codepen.io/15351970/photo-output_12.jpeg
Azzaro | Forever elexir | 49.99 | https://assets.codepen.io/15351970/IMG_5188.jpeg
 
Burberry | Hero | 49.99 | https://assets.codepen.io/15351970/IMG_5157.jpeg
Burberry | Goddess | 49.99 | https://assets.codepen.io/15351970/IMG_5158.jpeg
Burberry | Blush | 49.99 | https://assets.codepen.io/15351970/IMG_5160.jpeg
Burberry | Goddess parfum | 49.99 | https://assets.codepen.io/15351970/photo-output_131.jpeg
Burberry | My Burbery Black | 49.99 | https://assets.codepen.io/15351970/IMG_5162.jpeg
Burberry | My Burbery edp | — | https://assets.codepen.io/15351970/IMG_5189.jpeg
 
Bvlgari | Omnia Coral | 69.99 | https://assets.codepen.io/15351970/IMG_5190.jpeg
Bvlgari | Man in black wood essance | 69.99 | https://assets.codepen.io/15351970/IMG_5191.jpeg
Bvlgari | Man in black | 69.99 | https://assets.codepen.io/15351970/IMG_5192.webp
Bvlgari | Splendida | 69.99 | https://assets.codepen.io/15351970/IMG_5193.webp
 
By Killian | Angel Share | 59.99 | https://assets.codepen.io/15351970/IMG_5194.jpeg
By Killian | Gold Woman | 59.99 | https://assets.codepen.io/15351970/IMG_5195.jpeg
By Killian | Straight to Heaven | 59.99 | https://assets.codepen.io/15351970/IMG_5196.jpeg
By Killian | Old fashioned | 59.99 | https://assets.codepen.io/15351970/IMG_5198.jpeg
By Killian | Rosés on ice | 59.99 | https://assets.codepen.io/15351970/IMG_5199.jpeg
 
Clive Christian | No1 | 69.99 | https://assets.codepen.io/15351970/IMG_5200.jpeg
 
Christian Dior | Ambre nuit | 59.99 | https://assets.codepen.io/15351970/IMG_5201.jpeg
Christian Dior | Vanilla Diorama | 59.99 | https://assets.codepen.io/15351970/IMG_5202.jpeg
Christian Dior | Oud Ispahan | 59.99 | https://assets.codepen.io/15351970/IMG_5203.jpeg
Christian Dior | Gris Dior | — | https://assets.codepen.io/15351970/IMG_5204.webp
Christian Dior | Bois argent | 59.99 | https://assets.codepen.io/15351970/IMG_5205.jpeg
 
Carolina Herrera | Badboy edt | 49.99 | https://assets.codepen.io/15351970/IMG_5206.jpeg
Carolina Herrera | Bad boy elexir | 49.99 | https://assets.codepen.io/15351970/IMG_5207.jpeg
Carolina Herrera | CH Irish Empire | 49.99 | https://assets.codepen.io/15351970/IMG_5208.jpeg
Carolina Herrera | Good girl Blush | 49.99 | https://assets.codepen.io/15351970/IMG_5209.jpeg
Carolina Herrera | Good girl sparkling ice | 49.99 | https://assets.codepen.io/15351970/IMG_5211.jpeg
Carolina Herrera | Good girl velvet fatale | 49.99 | https://assets.codepen.io/15351970/IMG_5212.jpeg
Carolina Herrera | Good girl edp | 49.99 | https://assets.codepen.io/15351970/IMG_5213.jpeg
Carolina Herrera | Good girl dot drama | 49.99 | https://assets.codepen.io/15351970/IMG_5214.jpeg
Carolina Herrera | Good girl very glam | 49.99 | https://assets.codepen.io/15351970/IMG_5215.jpeg
Carolina Herrera | Good girl fantastisch pink | 49.99 | https://assets.codepen.io/15351970/IMG_5216.jpeg
Carolina Herrera | Good girl suprème | 49.99 | https://assets.codepen.io/15351970/IMG_5217.jpeg
 
Chanel | Bleu edp | 49.99 | https://assets.codepen.io/15351970/IMG_5218.jpeg
Chanel | Bleu Parfum | 49.99 | https://assets.codepen.io/15351970/IMG_5219.jpeg
Chanel | Cristalle | 49.99 | https://assets.codepen.io/15351970/IMG_5220.jpeg
Chanel | Allure edp | 49.99 | https://assets.codepen.io/15351970/IMG_5221.jpeg
Chanel | No5 | 49.99 | https://assets.codepen.io/15351970/IMG_5222.jpeg
Chanel | N°1 de Chanel | — | https://assets.codepen.io/15351970/IMG_5223.jpeg
Chanel | Allure Homme Sport | 49.99 | https://assets.codepen.io/15351970/IMG_5224.jpeg
Chanel | Coco Mademoiselle | 49.99 | https://assets.codepen.io/15351970/IMG_5225.webp
Chanel | Coco Noir | 49.99 | https://assets.codepen.io/15351970/IMG_5226.jpeg
Chanel | Platinum Egoist | 49.99 | https://assets.codepen.io/15351970/IMG_5228.jpeg
Chanel | Chanel chance eau splendide | 49.99 | https://assets.codepen.io/15351970/IMG_5247.jpeg
Chanel | Chanel Chance Eau De Parfum | 49.99 | https://assets.codepen.io/15351970/IMG_5248.jpeg
Chanel | Chanel Chance Fraiche | 49.99 | https://assets.codepen.io/15351970/IMG_5249.jpeg
Chanel | Chanel Chance Trendre | — | https://assets.codepen.io/15351970/IMG_5250.jpeg
 
Chloe | Chloe edp | 49.99 | https://assets.codepen.io/15351970/IMG_5251.jpeg
Chloe | Chloe Nomade Naturelle | 49.99 | https://assets.codepen.io/15351970/IMG_5254.jpeg
Chloe | Chloe Nomade edp | 49.99 | https://assets.codepen.io/15351970/IMG_5252.jpeg
Chloe | Chloe Nomade Nuit Egypte | — | https://assets.codepen.io/15351970/IMG_5255.jpeg
 
Creed | Aventus man | 59.99 | https://assets.codepen.io/15351970/IMG_5256.jpeg
Creed | Silver montain water | 59.99 | https://assets.codepen.io/15351970/IMG_5257.jpeg
Creed | Aventus For her | 59.99 | https://assets.codepen.io/15351970/IMG_2.jpeg
Creed | Spring Flower | 59.99 | https://assets.codepen.io/15351970/IMG_5259.jpeg
 
Dior | Dune | 49.99 | https://assets.codepen.io/15351970/IMG_5261.jpeg
Dior | Joy | 49.99 | https://assets.codepen.io/15351970/IMG_3.jpeg
Dior | Sauvege elexir | 49.99 | https://assets.codepen.io/15351970/IMG_5264.tiff
Dior | Sauvege Eau de Parfüm | 49.99 | https://assets.codepen.io/15351970/IMG_5265.jpeg
Dior | Sauvege Parfüm | 49.99 | https://assets.codepen.io/15351970/IMG_5266.jpeg
Dior | Farenheit Eau De Toilet | 49.99 | https://assets.codepen.io/15351970/IMG_5267.jpeg
Dior | Miss Dior Cherry | 49.99 | https://assets.codepen.io/15351970/IMG_5268.jpeg
Dior | Miss Dior Blooming Bouquet | 49.99 | https://assets.codepen.io/15351970/IMG_5291.jpeg
Dior | Dior Homme | 49.99 | https://assets.codepen.io/15351970/IMG_5292.jpeg
Dior | Dior Homme Intense | 49.99 | https://assets.codepen.io/15351970/IMG_5293.jpeg
Dior | Jadore edp | 49.99 | https://assets.codepen.io/15351970/IMG_5294.jpeg
Dior | Addict | 49.99 | https://assets.codepen.io/15351970/IMG_5295.jpeg
Dior | Hypnotic poison | 49.99 | https://assets.codepen.io/15351970/IMG_5297.jpeg
D&G | King | 49.99 | https://assets.codepen.io/15351970/IMG_5298.webp
D&G | The one Man | 49.99 | https://assets.codepen.io/15351970/IMG_5299.jpeg
D&G | The one Woman | 49.99 | https://assets.codepen.io/15351970/IMG_5300.jpeg
D&G | 3 L’imperatrice | 49.99 | https://assets.codepen.io/15351970/IMG_5301.jpeg
D&G | Devotion | 49.99 | https://assets.codepen.io/15351970/IMG_5302.jpeg
Armani Lux | Prive Rouge Malachite | 59.99 | https://assets.codepen.io/15351970/IMG_5303.jpeg
Armani Lux | Prive Vert Malachite | 59.99 | https://assets.codepen.io/15351970/IMG_5304.jpeg
Armani Lux | Prive Rose D’Arabie | 59.99 | https://assets.codepen.io/15351970/IMG_5305.jpeg
Armani | Si intens | 49.99 | https://assets.codepen.io/15351970/IMG_5306.jpeg
Armani | Si passion | 49.99 | https://assets.codepen.io/15351970/IMG_5306.jpeg
Armani | Si passion red musk | 49.99 | https://assets.codepen.io/15351970/IMG_5309.jpeg
Armani | My Way intense | 49.99 | https://assets.codepen.io/15351970/IMG_2.webp
Armani | My way edp | 49.99 | https://assets.codepen.io/15351970/IMG_4.jpeg
Armani | Armani Code Profumo | 49.99 | https://assets.codepen.io/15351970/IMG_5.jpeg
Armani | Armani code edt | 49.99| https://assets.codepen.io/15351970/IMG_6.jpeg
Armani | Armani code parfum | 49.99 | https://assets.codepen.io/15351970/IMG_7.jpeg
Armani | You parfum | 49.99 | https://assets.codepen.io/15351970/IMG_9.jpeg
Armani | You edt | 49.99 | https://assets.codepen.io/15351970/IMG_10.jpeg
Armani | You Amber | 49.99 | https://assets.codepen.io/15351970/IMG_11.jpeg
Armani | You intensely | 49.99 | https://assets.codepen.io/15351970/IMG_12.jpeg
Armani | You absolutely | 49.99 | https://assets.codepen.io/15351970/IMG_5320.jpeg
Armani | You Because | 49.99 | https://assets.codepen.io/15351970/IMG_5321.jpeg
Armani | You Leather | 49.99 | https://assets.codepen.io/15351970/IMG_5322.jpeg
Armani | Aqua Di Gio Profondo | 49.99 | https://assets.codepen.io/15351970/IMG_5324.jpeg
Armani | Aqua Di Gio Classic | 49.99 | https://assets.codepen.io/15351970/IMG_5325.jpeg
Armani | Aqua Di Gio profumo | 49.99 | https://assets.codepen.io/15351970/IMG_5323.jpeg
Armani | Aqua Di Gio absolu | 49.99 | https://assets.codepen.io/15351970/IMG_5326.jpeg
 
Gisada | Gisada man | 49.99 | https://assets.codepen.io/15351970/IMG_5334.jpeg
Gisada | Gisada Woman | 49.99 | https://assets.codepen.io/15351970/IMG_5335.jpeg
 
Givenchy | Ange ou demon | 49.99 | https://assets.codepen.io/15351970/IMG_15.jpeg
Givenchy | Ange ou demon le secret | 49.99 | https://assets.codepen.io/15351970/IMG_16.jpeg
Givenchy | Linterdit absolu | 49.99 | https://assets.codepen.io/15351970/IMG_17.jpeg
Givenchy | Linterdit Eau de Parfüm | 49.99 | https://assets.codepen.io/15351970/IMG_18.jpeg
Givenchy | Linterdit Rouge | 49.99 | https://assets.codepen.io/15351970/IMG_20.jpeg
Givenchy | Linterdit intense | 49.99 | https://assets.codepen.io/15351970/IMG_19.jpeg
Givenchy | Linterdit rouge ultime | 49.99 | https://assets.codepen.io/15351970/IMG_5340.jpeg
Givenchy | Gentleman edp | 49.99 | https://assets.codepen.io/15351970/IMG_21.jpeg
Givenchy | Gentleman Boise | 49.99 | https://assets.codepen.io/15351970/IMG_22.jpeg
Givenchy | Gentleman Society | 49.99 | https://assets.codepen.io/15351970/IMG_24.jpeg
Givenchy | Gentleman Society ambree | 49.99 | https://assets.codepen.io/15351970/IMG_5355.webp
Givenchy | Irresistible edp | 49.99 | https://assets.codepen.io/15351970/IMG_5356.jpeg
Givenchy | Irresistible Rose velvet | 49.99 | https://assets.codepen.io/15351970/IMG_5357.jpeg
 
Victoria secret | Angel gold | 49.99 | https://assets.codepen.io/15351970/IMG_5372.jpeg
Gucci | Gucci Flora Gardenia | 59.99 | https://assets.codepen.io/15351970/IMG_5373.jpeg
Gucci | Gucci Flora Magnolia | 59.99 | https://assets.codepen.io/15351970/IMG_5374.jpeg
Gucci | Gucci Flora jasmine | 59.99 | https://assets.codepen.io/15351970/IMG_5375.jpeg
Gucci | Gucci Flora orchid | 59.99 | https://assets.codepen.io/15351970/IMG_5376.jpeg
Gucci | Gucci Flora Gardenia intens | 59.99 | https://assets.codepen.io/15351970/IMG_5377.jpeg
Gucci | Gucci bloom | 59.99 | https://assets.codepen.io/15351970/IMG_5378.jpeg
Gucci | Gucci bambo | 59.99 | https://assets.codepen.io/15351970/IMG_5379.jpeg
Gucci | Gucci guilty elexir homme | 59.99 | https://assets.codepen.io/15351970/IMG_5380.jpeg
Gucci | Gucci guilty elexir femme | 59.99 | https://assets.codepen.io/15351970/IMG_5381.jpeg
 
Guerlian | Mon guerlain | 49.99 | https://assets.codepen.io/15351970/IMG_5383.jpeg
 
Hugo Boss | The Scent Man | 49.99 | https://assets.codepen.io/15351970/IMG_5384.jpeg
Hugo Boss | Bottled | 49.99 | https://assets.codepen.io/15351970/IMG_5385.webp
Hugo Boss | Bottled triumph elexir | 49.99 | https://assets.codepen.io/15351970/IMG_5386.jpeg
 
Jeroboam Gozo | Jeroboam Gozo by Red | 69.99 | https://assets.codepen.io/15351970/IMG_5387.jpeg
Jeroboam Gozo | Jeroboam Gozo Lab Edition | 69.99 | https://assets.codepen.io/15351970/IMG_5388.jpeg
Jean Paul Gaultier | Divine | 59.99 | https://assets.codepen.io/15351970/IMG_5389.jpeg
Jean Paul Gaultier | Le Beau | 59.99 | https://assets.codepen.io/15351970/IMG_5390.jpeg
Jean Paul Gaultier | Le beau intens | 59.99 | https://assets.codepen.io/15351970/IMG_14.jpeg
Jean Paul Gaultier | Le Male elexir parfum | 59.99 | https://assets.codepen.io/15351970/IMG_5422.jpeg
Jean Paul Gaultier | Le Male Essence | 59.99 | https://assets.codepen.io/15351970/IMG_5423.jpeg
Jean Paul Gaultier | Le Male edt | 59.99 | https://assets.codepen.io/15351970/IMG_5424.jpeg
Jean Paul Gaultier | Le Male Le Parfum | 59.99 | https://assets.codepen.io/15351970/IMG_5425.jpeg
Jean Paul Gaultier | Le Beau paradis garden | 59.99 | https://assets.codepen.io/15351970/IMG_5426.jpeg
Jean Paul Gaultier | La Belle paradis garden | 59.99 | https://assets.codepen.io/15351970/IMG_5458.jpeg
Jean Paul Gaultier | Scandal gold women | 59.99 | https://assets.codepen.io/15351970/IMG_5459.jpeg
Jean Paul Gaultier | Scandal man (square) | 59.99 | https://assets.codepen.io/15351970/IMG_5460.jpeg
Jean Paul Gaultier | Scandal woman (square) | 59.99 | https://assets.codepen.io/15351970/IMG_5554.png
 
Marc Jacobs | Decadence | 39.99 | https://assets.codepen.io/15351970/IMG_5557.webp
 
Kayali | Elexir | 59.99 | https://assets.codepen.io/15351970/IMG_5558.jpeg
Kayali | Invite only amber | 59.99 | https://assets.codepen.io/15351970/IMG_5559.jpeg
Kayali | Kayali yum pistachio | 59.99 | https://assets.codepen.io/15351970/IMG_5561.webp
Kayali | Kayali Eden | 59.99 | https://assets.codepen.io/15351970/IMG_5562.jpeg
Kayali | Kayali lovefest | 59.99 | https://assets.codepen.io/15351970/IMG_5563.jpeg
 
Memo | Mafra | 59.99 | https://assets.codepen.io/15351970/IMG_5564.jpeg
 
Lancome | Hypnose | 49.99 | https://assets.codepen.io/15351970/IMG_5565.jpeg
Lancome | Poeme | 49.99 | https://assets.codepen.io/15351970/IMG_5566.jpeg
Lancome | La vie est belle elexir | 49.99 | https://assets.codepen.io/15351970/IMG_5567.jpeg
Lancome | La Vie Est Belle | 49.99 | https://assets.codepen.io/15351970/IMG_25.jpeg
Lancome | Idole le parfum | 49.99 | https://assets.codepen.io/15351970/IMG_5621.jpeg
Lancome | Tresor la nuit | 49.99 | https://assets.codepen.io/15351970/IMG_5622.jpeg
 
Louis Vuitton | Pur oud | 79.99 | https://assets.codepen.io/15351970/IMG_5623.jpeg
Louis Vuitton | Ombre nomade | 69.99 | https://assets.codepen.io/15351970/IMG_5625.jpeg
Louis Vuitton | Imigination | 69.99 | https://assets.codepen.io/15351970/IMG_5626.jpeg
Louis Vuitton | Attrapes-reves | 69.99 | https://assets.codepen.io/15351970/IMG_5627.jpeg
Louis Vuitton | Dans La Peau | 69.99 | https://assets.codepen.io/15351970/IMG_5628.jpeg
Louis Vuitton | Les sambles roses | 69.99 | https://assets.codepen.io/15351970/IMG_5629.jpeg
Louis Vuitton | Liminsite | 69.99 | https://assets.codepen.io/15351970/IMG_5631.jpeg
Louis Vuitton | Pacific Chill | 69.99 | https://assets.codepen.io/15351970/IMG_5633.jpeg
Louis Vuitton | Afternoon swim | 69.99 | https://assets.codepen.io/15351970/IMG_5634.jpeg
 
Maison Francis Kurkdjan | Baccarat Rouge 540 RED | 59.99 | https://assets.codepen.io/15351970/IMG_5635.jpeg
Maison Francis Kurkdjan | Baccarat oud satin mood |59.99  | https://assets.codepen.io/15351970/IMG_5636.jpeg
Maison Francis Kurkdjan | Baccarat rouge 540 white |59.99 | https://assets.codepen.io/15351970/IMG_5637.jpeg
Maison Francis Kurkdjan | Grand soir |59.99 | https://assets.codepen.io/15351970/IMG_5638.jpeg
Maison Francis Kurkdjan | À la Rose |59.99 | https://assets.codepen.io/15351970/IMG_5641.jpeg
Maison Francis Kurkdjan | Absolue pour le soir | 59.99 | https://assets.codepen.io/15351970/IMG_5642.jpeg
Maison Francis Kurkdjan | 724 | 59.99 | https://assets.codepen.io/15351970/IMG_5643.jpeg
Maison Francis Kurkdjan | Kurky | 59.99 | https://assets.codepen.io/15351970/IMG_5644.jpeg
Maison Francis Kurkdjan | Gentle fluidity | 59.99 | https://assets.codepen.io/15351970/IMG_5645.jpeg
 
Maison Crivelli | Oud stallion | 59.99 | https://assets.codepen.io/15351970/IMG_5647.webp
Maison Crivelli | Tubéreuse Astrale | 59.99  | https://assets.codepen.io/15351970/IMG_5648.jpeg
Maison Crivelli | Patchouli magnetik | 59.99 | https://assets.codepen.io/15351970/IMG_5649.jpeg
 
Mancera | Tonka cola | 49.99 | https://assets.codepen.io/15351970/IMG_5652.jpeg
Mancera | Red tobacco | 49.99 | https://assets.codepen.io/15351970/IMG_5653.jpeg
Mancera | Roses vanille | 49.99 | https://assets.codepen.io/15351970/IMG_5654.jpeg
Mancera | Cedrat boise | 49.99 | https://assets.codepen.io/15351970/IMG_5655.jpeg
 
Replica | Jazz club | 59.99 | https://assets.codepen.io/15351970/IMG_5656.jpeg
 
Montale | Bubble Forever | 49.99 | https://assets.codepen.io/15351970/IMG_5657.jpeg
Montale | Arabians tonka | 49.99 | https://assets.codepen.io/15351970/IMG_5658.jpeg
Montale | Arabians musk | 49.99 | https://assets.codepen.io/15351970/IMG_5659.jpeg
Montale | Infinity | 49.99 | https://assets.codepen.io/15351970/IMG_5660.webp
Montale | Aoud Forest | 49.99 | https://assets.codepen.io/15351970/IMG_26.jpeg
Montale | Candy rose | 49.99 | https://assets.codepen.io/15351970/IMG_27.jpeg
Montale | Black aoud | 49.99 | https://assets.codepen.io/15351970/IMG_5668.jpeg
Montale | Vanille absolu | 49.99 | https://assets.codepen.io/15351970/IMG_5669.jpeg
Montale | Roses elexir | 49.99 | https://assets.codepen.io/15351970/IMG_5670.webp
Montale | Arabians | 49.99 | https://assets.codepen.io/15351970/IMG_28.jpeg
Montale | Intens cherry | 49.99 | https://assets.codepen.io/15351970/IMG_5672.jpeg
Montale | Roses musk | 49.99 | https://assets.codepen.io/15351970/IMG_5673.jpeg
Montale | Cristal flowers | 49.99 | https://assets.codepen.io/15351970/IMG_29.jpeg
Montale | Starry nights | 49.99 | https://assets.codepen.io/15351970/IMG_5676.jpeg
Montale | Intens pepper | 49.99 | https://assets.codepen.io/15351970/IMG_5677.webp
Montale | Jasmine Full | 49.99 | https://assets.codepen.io/15351970/IMG_5678.png
Montale | Amber&Spices | 49.99 | https://assets.codepen.io/15351970/IMG_5679.jpeg
Montale | White Musk | 49.99 | https://assets.codepen.io/15351970/IMG_5680.jpeg
Montale | Intens Tiare | 49.99 | https://assets.codepen.io/15351970/IMG_5681.jpeg
Montale | Pure Gold | 49.9999 | https://assets.codepen.io/15351970/IMG_5682.webp
Montale | Mango Manga | 49.99 | https://assets.codepen.io/15351970/IMG_5683.jpeg
Montale | Mukhalat | 49.99 | https://assets.codepen.io/15351970/IMG_5684.jpeg
Montale | Intense Cafe | 49.99 | https://assets.codepen.io/15351970/IMG_5685.jpeg
 
Morph | Indomable | 59.99 | https://assets.codepen.io/15351970/IMG_5687.webp
Morph | Zeta | 59.99 | https://assets.codepen.io/15351970/IMG_5686.jpeg
Narcisio Rodriguez | Pure musc | 59.99 | https://assets.codepen.io/15351970/IMG_5688.jpeg
Narcisio Rodriguez | For her edt | 59.99 | https://assets.codepen.io/15351970/IMG_5689.jpeg
Narcisio Rodriguez | For her edp | 59.99 | https://assets.codepen.io/15351970/IMG_5696.jpeg
Narcisio Rodriguez | Rouge edp | 59.99 | https://assets.codepen.io/15351970/IMG_5697.jpeg
Narcisio Rodriguez | Ambree | 59.99 | https://assets.codepen.io/15351970/photo-output.jpeg
Narcisio Rodriguez | Poudre | 59.99 | https://assets.codepen.io/15351970/photo-output_1.jpeg
Nasomato | Duro | 69.99 | https://assets.codepen.io/15351970/photo-output_2.jpeg
Nasomato | Pardon Extrait de parfum | 69.99 | https://assets.codepen.io/15351970/photo-output_4.jpeg
Nasomato | Blamage | 69.99 | https://assets.codepen.io/15351970/photo-output_5.jpeg
Parfums de Marley | Althair | 59.99 | https://assets.codepen.io/15351970/IMG_5711.jpeg
Parfums de Marley | Pegasus | 59.99 | https://assets.codepen.io/15351970/photo-output_6.jpeg
Parfums de Marley | Palatine | 59.99 | https://assets.codepen.io/15351970/photo-output_7.jpeg
Parfums de Marley | Delina | 59.99 | https://assets.codepen.io/15351970/photo-output_8.jpeg
Parfums de Marley | Godolphin | 59.99 | https://assets.codepen.io/15351970/IMG_5719.webp
Parfums de Marley | Galloway | 59.99 | https://assets.codepen.io/15351970/photo-output_9.jpeg
Parfums de Marley | Perseus | 59.99 | https://assets.codepen.io/15351970/IMG_5722.jpeg
Parfums de Marley | Layton | 59.99 | https://assets.codepen.io/15351970/IMG_5723.jpeg
Parfums de Marley | Kalan | 59.99 | https://assets.codepen.io/15351970/photo-output_10.jpeg
Paco Rabanne | Pure Xs her | 49.99 | https://assets.codepen.io/15351970/photo-output_13.jpeg
Paco Rabanne | Pure Xs Him | 49.99 | https://assets.codepen.io/15351970/photo-output_14.jpeg
Paco Rabanne | Phantom parfum | 49.99 | https://assets.codepen.io/15351970/photo-output_15.jpeg
Paco Rabanne | Phantum legion | 49.99 | https://assets.codepen.io/15351970/photo-output_16.jpeg
Paco Rabanne | Phantom edt | 49.99 | https://assets.codepen.io/15351970/IMG_5738.jpeg
Paco Rabanne | Invictus edt | 49.99 | https://assets.codepen.io/15351970/photo-output_17.jpeg
Paco Rabanne | Invictus parfum | 49.99 | https://assets.codepen.io/15351970/photo-output_18.jpeg
Paco Rabanne | One million elexir | 49.99 | https://assets.codepen.io/15351970/photo-output_19.jpeg
Paco Rabanne | One million parfum | 49.99 | https://assets.codepen.io/15351970/photo-output_20.jpeg
Paco Rabanne | One million prive | 49.99 | https://assets.codepen.io/15351970/photo-output_21.jpeg
Paco Rabanne | One million edt | 49.99 | https://assets.codepen.io/15351970/photo-output_22.jpeg
Paco Rabanne | Lady Million edp | 49.99 | https://assets.codepen.io/15351970/photo-output_23.jpeg
Paco Rabanne | Lady million gold for her | 49.99 | https://assets.codepen.io/15351970/photo-output_24.jpeg
Paco Rabanne | Olympea Eau de Parfum | 49.99 | https://assets.codepen.io/15351970/photo-output_25.jpeg
Paco Rabanne | Olympea intens | 49.99 | https://assets.codepen.io/15351970/photo-output_26.jpeg
Paco Rabanne | Olympea Parfum | 49.99 | https://assets.codepen.io/15351970/photo-output_27.jpeg
Paco Rabanne | Fame pink | 49.99 | https://assets.codepen.io/15351970/photo-output_28.jpeg
Prada | Prada black | 49.99 | https://assets.codepen.io/15351970/photo-output_29.jpeg
Prada | Prada Carbon | 49.99 | https://assets.codepen.io/15351970/photo-output_30.jpeg
Xerjoff LUX 100 ml | Kastas |output_31.jpeg
Prada | Prada paradox intens | 49.99 | https://assets.codepen.io/15351970/IMG_5771.jpeg
Tiziana Terenzi | Kirke | 69.99 | https://assets.codepen.io/15351970/photo-output_32.jpeg
Tiziana Terenzi | Delox | 69.99 | https://assets.codepen.io/15351970/IMG_5775.jpeg
Tiziana Terenzi | Gumin | 69.99 | https://assets.codepen.io/15351970/photo-output_33.jpeg
Tiziana Terenzi | Comete halley | 69.99 | https://assets.codepen.io/15351970/photo-output_34.jpeg
Hermes | Intens vetiver | 59.99 | https://assets.codepen.io/15351970/photo-output_35.jpeg
Hermes | Terre hermes | 59.99 | https://assets.codepen.io/15351970/photo-output_36.jpeg
Hermes | Barénia | 59.99 | https://assets.codepen.io/15351970/photo-output_37.jpeg
 
Tom Ford | Soleil blanc | 59.99 | https://assets.codepen.io/15351970/photo-output_38.jpeg
Tom Ford | Lost cherry | 59.99 | https://assets.codepen.io/15351970/photo-output_39.jpeg
Tom Ford | Tobacco vanille | 59.99 | https://assets.codepen.io/15351970/IMG_5794.jpeg
Tom Ford | Vanilla sex | 59.99 | https://assets.codepen.io/15351970/photo-output_40.jpeg
Tom Ford | Mandarino di amalfi | 59.99 | https://assets.codepen.io/15351970/photo-output_41.jpeg
Tom Ford | Electric cherry | 59.99 | https://assets.codepen.io/15351970/photo-output_42.jpeg
Tom Ford | Vanille fatale | 59.99 | https://assets.codepen.io/15351970/photo-output_43.jpeg
Tom Ford | Neroli portofino | 59.99 | https://assets.codepen.io/15351970/photo-output_44.jpeg
Tom Ford | Tuscan leather | 59.99 | https://assets.codepen.io/15351970/photo-output_45.jpeg
Tom Ford | Rose exposed | 59.99 | https://assets.codepen.io/15351970/photo-output_46.jpeg
Tom Ford | Black orchid | 59.99 | https://assets.codepen.io/15351970/IMG_5809.jpeg
Tom Ford | Velvet orchid | 59.99 | https://assets.codepen.io/15351970/IMG_5810.jpeg
Tom Ford | Grey vetiver | 60 | https://assets.codepen.io/15351970/IMG_5811.jpeg
Tom Ford | Cherry smoke | 59.99 | https://assets.codepen.io/15351970/photo-output_47.jpeg
Tom Ford | F.Faboulos | 59.99 | https://assets.codepen.io/15351970/photo-output_48.jpeg
Tom Ford | Noir De Noir | 59.99 | https://assets.codepen.io/15351970/IMG_5816.jpeg
Tom Ford | Bitter peach | 59.99 | https://assets.codepen.io/15351970/photo-output_49.jpeg
Tom Ford | Oud Wood | 59.99 | https://assets.codepen.io/15351970/photo-output_50.jpeg
Tom Ford | Noir | 59.99 | https://assets.codepen.io/15351970/IMG_5821.jpeg
Tom Ford | Noir extrem | 59.99 | https://assets.codepen.io/15351970/IMG_5822.jpeg
Tom Ford | Rose Pick | 59.99 | https://assets.codepen.io/15351970/photo-output_51.jpeg
Tom Ford | Cafe rose | 59.99 | https://assets.codepen.io/15351970/photo-output_52.jpeg|
Tom Ford | Oud minerale | 59.99 | https://assets.codepen.io/15351970/IMG_5828.jpeg
 
Victor Rolf | Spice Bomb extrem | 49.99 | https://assets.codepen.io/15351970/photo-output_53.jpeg
Victor Rolf | Spice Bomb | 49.99 | https://assets.codepen.io/15351970/photo-output_54.jpeg
Victor Rolf | Spicebomb Infrared | 49.99 | https://assets.codepen.io/15351970/photo-output_55.jpeg
Victor Rolf | Spicebomb Night Vision | 49.99 | https://assets.codepen.io/15351970/photo-output_57.jpeg
Victor Rolf | Spicebomb Dark Leather | 49.99 | https://assets.codepen.io/15351970/photo-output_58.jpeg
Victor Rolf | Bon Bon | 49.99 | https://assets.codepen.io/15351970/photo-output_59.jpeg
Victor Rolf | Flowerbomb | 49.99 | https://assets.codepen.io/15351970/photo-output_60.jpeg
Valentino | Uomo | 49.99 | https://assets.codepen.io/15351970/photo-output_65.jpeg
Valentino | Donna born in roma intens | 49.99 | https://assets.codepen.io/15351970/photo-output_62.jpeg
Valentino | Donna born in roma yellow dream | 49.99 | https://assets.codepen.io/15351970/photo-output_63.jpeg
Valentino | Uomo born in roma intens | 49.99 | https://assets.codepen.io/15351970/photo-output_64.jpeg
Versace | Bright Crystal EDT | 59.99 | https://assets.codepen.io/15351970/IMG_5856.jpeg
Versace | Crystal noir | 59.99 | https://assets.codepen.io/15351970/photo-output_66.jpeg
Versace | Eros Najim | 59.99 | https://assets.codepen.io/15351970/photo-output_67.jpeg
Versace | Eros Edp | 59.99 | https://assets.codepen.io/15351970/photo-output_68.jpeg
Versace | Eros Parfum | 59.99 | https://assets.codepen.io/15351970/photo-output_69.jpeg
Versace | Eros Flame | 59.99 | https://assets.codepen.io/15351970/photo-output_70.jpeg
Versace | Eros Energy | 59.99 | https://assets.codepen.io/15351970/IMG_5867.jpeg
Xerjoff LUX 100 ml | Erba pura | 69.99 | https://assets.codepen.io/15351970/photo-output_71.jpeg
Xerjoff LUX 100 ml | Naxoss | 69.99 | https://assets.codepen.io/15351970/photo-output_72.jpeg
Xerjoff LUX 100 ml | More then words | 69.99 | https://assets.codepen.io/15351970/photo-output_73.jpeg
Xerjoff LUX 100 ml | Opera | 69.99 | https://assets.codepen.io/15351970/photo-output_74.jpeg
Xerjoff LUX 100 ml | Accento | 69.99 | https://assets.codepen.io/15351970/photo-output_75.jpeg
Xerjoff LUX 100 ml | Erba Gold | 69.99 | https://assets.codepen.io/15351970/photo-output_76.jpeg
Xerjoff LUX 100 ml | Accento overdose | 69.99 | https://assets.codepen.io/15351970/photo-output_78.jpeg
Xerjoff LUX 100 ml | Purpple accento | 69.99 | https://assets.codepen.io/15351970/photo-output_79.jpeg
Xerjoff LUX 100 ml | Erba tropica | 69.99 | https://assets.codepen.io/15351970/photo-output_80.jpeg
Xerjoff LUX 100 ml | Oud Stars | 69.99 | https://assets.codepen.io/15351970/IMG_5892.jpeg
Xerjoff LUX 100 ml | Laylati | 69.99 | https://assets.codepen.io/15351970/photo-output_81.jpeg

Xerjoff LUX 100 ml | Iommi | 69.99 | https://assets.codepen.io/15351970/photo-output_83.jpeg
Xerjoff LUX 100 ml | Torino 21 | 69.99 | https://assets.codepen.io/15351970/photo-output_84.jpeg
Xerjoff LUX 100 ml | Groove Xcape | 69.99 | https://assets.codepen.io/15351970/photo-output_85.jpeg
Xerjoff LUX 100 ml | Renaissance | 69.99 | https://assets.codepen.io/15351970/photo-output_86.jpeg
Xerjoff LUX 100 ml | Decas | 69.99 | https://assets.codepen.io/15351970/photo-output_87.jpeg
Xerjoff LUX 100 ml | 40 knots | 69.99 | https://assets.codepen.io/15351970/photo-output_88.jpeg
Xerjoff LUX 100 ml | Wardasina | 69.99 | https://assets.codepen.io/15351970/photo-output_89.jpeg
Xerjoff LUX 100 ml | Muse | 69.99 | https://assets.codepen.io/15351970/photo-output_90.jpeg
Xerjoff lux 50ml | Homme Anniversary | 69.99 | https://assets.codepen.io/15351970/photo-output_91.jpeg
Xerjoff lux 50ml | Elle Anniversary | 69.99 | https://assets.codepen.io/15351970/photo-output_92.jpeg
Xerjoff lux 50ml | louis xv de venoge | 69.99 | https://assets.codepen.io/15351970/photo-output_93.jpeg
Xerjoff lux 50ml | Iomi deified | 69.99 | https://assets.codepen.io/15351970/photo-output_94.jpeg
Xerjoff lux 50ml | Starlight | 69.99 | https://assets.codepen.io/15351970/photo-output_95.jpeg
Xerjoff lux 50ml | Torino 22 | 69.99 | https://assets.codepen.io/15351970/photo-output_96.jpeg
Xerjoff lux 50ml | Torino 23 | 69.99 | https://assets.codepen.io/15351970/photo-output_97.jpeg
Xerjoff lux 50ml | Torino 24 | 69.99 | https://assets.codepen.io/15351970/photo-output_98.jpeg
Xerjoff normal | Erba pura | 69.99 | https://assets.codepen.io/15351970/photo-output_99.jpeg
Xerjoff normal | Naxos | 69.99 | https://assets.codepen.io/15351970/photo-output_100.jpeg
Xerjoff normal | Opera | 69.99 | https://assets.codepen.io/15351970/photo-output_101.jpeg

Xerjoff normal | Accento | 69.99 | https://assets.codepen.io/15351970/photo-output_102.jpeg
YSL | Libre Flowers&Flames | 69.99 | https://assets.codepen.io/15351970/photo-output_104.jpeg
YSL | Libre L’Eau Nue | 59.99 | https://assets.codepen.io/15351970/photo-output_105.jpeg
YSL | Libre edp | 59.99 | https://assets.codepen.io/15351970/photo-output_106.jpeg
YSL | Libre intense | 59.99 | https://assets.codepen.io/15351970/photo-output_107.jpeg
YSL | Libre Le Parfum | 59.99 | https://assets.codepen.io/15351970/photo-output_108.jpeg
YSL | Myself le parfum | 59.99 | https://assets.codepen.io/15351970/IMG_6036.jpeg
YSL | Myself edp | 59.99 | https://assets.codepen.io/15351970/photo-output_109.jpeg
YSL | Supreme Bouquet | 59.99 | https://assets.codepen.io/15351970/photo-output_110.jpeg
YSL | Black opium edp | 59.99 | https://assets.codepen.io/15351970/photo-output_111.jpeg
YSL | Black opium edp over red | 59.99 | https://assets.codepen.io/15351970/photo-output_112.jpeg
YSL | Black opium Glitter edp | 59.99 | https://assets.codepen.io/15351970/photo-output_113.jpeg
YSL | Mon paris | 59.99 | https://assets.codepen.io/15351970/photo-output_114.jpeg
YSL | Manifesto | 59.99 | https://assets.codepen.io/15351970/photo-output_116.jpeg
YSL | L’Homme edt | 59.99 | https://assets.codepen.io/15351970/photo-output_115.jpeg
YSL | Ysl Y | 59.99 | https://assets.codepen.io/15351970/photo-output_117.jpeg
Cartier | Cartier Le panthere Parfum | 49.99 | https://assets.codepen.io/15351970/photo-output_118.jpeg
Cartier | Cartier Le panthere Toilet | 49.99.| https://assets.codepen.io/15351970/photo-output_119.jpeg
Tierry Mugler | Alien | 49.99 | https://assets.codepen.io/15351970/photo-output_120.jpeg
Tierry Mugler | Angel edp | 49.99 | https://assets.codepen.io/15351970/photo-output_121.jpeg
Armaf | Club de nuit Milesteno | 29.99 | https://assets.codepen.io/15351970/photo-output_122.jpeg
Megamare | Orto Parisi | 69.99 | https://assets.codepen.io/15351970/photo-output_123.jpeg
Trussardi | Le Vie Di Milano | 49.99 | https://assets.codepen.io/15351970/photo-output_125.jpeg
Michael Kors | Pour homme edp | 49.99 | https://assets.codepen.io/15351970/photo-output_124.jpeg
Zadig & Voltaire | This is Him! | 39.99 | https://assets.codepen.io/15351970/photo-output_126.jpeg
Zadig & Voltaire | This is her! | 39.99 | https://assets.codepen.io/15351970/photo-output_127.jpeg
Frederic Malle | The moon | 79.99 | https://assets.codepen.io/15351970/photo-output_129.jpeg
Frederic Malle | The night | 79.99 | https://assets.codepen.io/15351970/photo-output_128.jpeg
Frederic Malle | Portrait of lady | 79.99 | https://assets.codepen.io/15351970/photo-output_130.jpeg
Botegga veneta | Edp | 69.99 | https://assets.codepen.io/15351970/photo-output.png
Calvin klein | Euphoria | 49.99 | https://assets.codepen.io/15351970/IMG_5868.jpeg
Louis Vuitton | Cactus Garden | 69.99 | https://assets.codepen.io/15351970/photo-output_133.jpeg
Prada | Prada paradox edp | 49.99 | https://assets.codepen.io/15351970/photo-output_134.jpeg
Xerjoff LUX 100 ml | Alexandria | 69.99 | https://assets.codepen.io/15351970/photo-output_135.jpeg
Xerjoff normal | Alexandria | 69.99 | https://assets.codepen.io/15351970/photo-output_136.jpeg

azzaro | most wanted intense | 49.99 | https://assets.codepen.io/15351970/photo-output_137.jpeg

victoria secret | bombshell | 49.99 | https://assets.codepen.io/15351970/photo-output_138.jpeg

essentric molecules | molecule 01 | 59.99 | https://assets.codepen.io/15351970/photo-output_139.jpeg

amouage | reasons | 69.99 | https://assets.codepen.io/15351970/photo-output_140.jpeg
amouage | outlands | 69.99 | https://assets.codepen.io/15351970/photo-output_141.jpeg

nasomatto | fantomas | 69.99 | https://assets.codepen.io/15351970/photo-output_142.jpeg
nasomatto | sadonaso | 69.99 | https://assets.codepen.io/15351970/photo-output_143.jpeg
nasomatto | baraonda | 69.99 | https://assets.codepen.io/15351970/photo-output_144.jpeg

bvlgari | le gemme tygar | 69.99 | https://assets.codepen.io/15351970/photo-output_145.jpeg

by kilian | back to black | 59.99 | https://assets.codepen.io/15351970/photo-output_146.jpeg
by kilian | black phantom | 59.99 | https://assets.codepen.io/15351970/photo-output_147.jpeg
by kilian | love don’t be shy | 59.99 | https://assets.codepen.io/15351970/photo-output_148.jpeg
by kilian | sacred wood | 59.99 | https://assets.codepen.io/15351970/photo-output_1.png

dior | miss dior absolutely blooming | 49.99 | https://assets.codepen.io/15351970/photo-output_149.jpeg

carolina herrera | bad boy gold fantasy | 49.99 | https://assets.codepen.io/15351970/photo-output_150.jpeg
carolina herrera | 212 vip black | 49.99 | https://assets.codepen.io/15351970/photo-output_151.jpeg

chanel | bleu de chanel l’exclusif | 59.99 | https://assets.codepen.io/15351970/IMG_6340.jpeg

penhaligon’s | mister sam | 69.99 | https://assets.codepen.io/15351970/051DF85D-2F66-4291-BF45-5DE092ED0677.jpeg
penhaligon’s | lord george | 69.99 | https://assets.codepen.io/15351970/photo-output_153.jpeg

stephane humbert lucas | pink boa | 69.99 | https://assets.codepen.io/15351970/photo-output_154.jpeg
stephane humbert lucas | god of fire | 69.99 | https://assets.codepen.io/15351970/photo-output_156.jpeg

guerlain | cherry oud | 59.99 | https://assets.codepen.io/15351970/photo-output_155.jpeg
guerlain | jasmine grandiflorum | 59.99 | https://assets.codepen.io/15351970/photo-output_157.jpeg
guerlain | rose cherie | 59.99 | https://assets.codepen.io/15351970/photo-output_158.jpeg

kayali | vanilla | 59.99 | https://assets.codepen.io/15351970/photo-output_159.jpeg
kayali | marshmallow | 59.99 | https://assets.codepen.io/15351970/photo-output_160.jpeg
kayali | candy rock sugar | 59.99 | https://assets.codepen.io/15351970/photo-output_162.jpeg
kayali | eden sparkling lychee | 59.99 | https://assets.codepen.io/15351970/photo-output_163.jpeg
kayali | utopia vanilla coco | 59.99 | https://assets.codepen.io/15351970/photo-output_164.jpeg

louis vuitton | meteore | 69.99 | https://assets.codepen.io/15351970/photo-output_165.jpeg

maison crivelli | hibiscus mahajad | 59.99 | https://assets.codepen.io/15351970/photo-output_166.jpeg
maison crivelli | oud maracuja | 59.99 | https://assets.codepen.io/15351970/photo-output_167.jpeg

marc antoine barrois | tilia | 69.99 | https://assets.codepen.io/15351970/photo-output_168.jpeg

memo | african leather | 59.99 | https://assets.codepen.io/15351970/photo-output_169.jpeg

montale | ristretto intense cafe | 49.99 | https://assets.codepen.io/15351970/photo-output_170.jpeg
montale | sensual instinct | 49.99 | https://assets.codepen.io/15351970/photo-output_171.jpeg

parfums de marly | delina royal essence | 59.99 | https://assets.codepen.io/15351970/photo-output_172.jpeg
parfums de marly | delina exclusif | 59.99 | https://assets.codepen.io/15351970/photo-output_173.jpeg

prada | paradox radical essence | 49.99 | https://assets.codepen.io/15351970/photo-output_174.jpeg
prada | luna rossa ocean | 49.99 | https://assets.codepen.io/15351970/photo-output_175.jpeg

versace | dylan blue man | 59.99 | https://assets.codepen.io/15351970/photo-output_176.jpeg
versace | crystal emerald | 59.99 | https://assets.codepen.io/15351970/photo-output_177.jpeg

xerjoff | overdose | 69.99 | https://assets.codepen.io/15351970/photo-output_179.jpeg

ysl lux | babycat | 69.99 | https://assets.codepen.io/15351970/photo-output_180.jpeg
ysl lux | tuxedo | 69.99 | https://assets.codepen.io/15351970/photo-output_181.jpeg
ysl lux | caban | 69.99 | https://assets.codepen.io/15351970/photo-output_182.jpeg

thierry mugler | angel nova | 49.99 | https://assets.codepen.io/15351970/photo-output_183.jpeg
thierry mugler | aura mugler | 49.99 | https://assets.codepen.io/15351970/photo-output_184.jpeg






`;
// Tip: plak hier je volledige lijst (die je eerder stuurde). Alles met [link] krijgt automatisch een nette fallback.

// 2) Basis state
let products = [];
let filtered = [];
let page = 1;
let cart = [];

// 3) Elements
const navLinks = document.getElementById("navLinks");
const sections = document.querySelectorAll(".section");
const hamburger = document.getElementById("hamburger");
document.addEventListener("click", (e) => {
  const isMenuOpen = navLinks.classList.contains("show");
  const clickedInsideMenu = navLinks.contains(e.target);
  const clickedHamburger = hamburger.contains(e.target);

  if (isMenuOpen && !clickedInsideMenu && !clickedHamburger) {
    closeMenu();
  }
});
function closeMenu(){
  navLinks.classList.remove("show");
  hamburger.setAttribute("aria-expanded", "false");
}
const filterBrand = document.getElementById("filterBrand");
const searchInput = document.getElementById("searchInput");
const productGrid = document.getElementById("productGrid");
const prevPage = document.getElementById("prevPage");
const nextPage = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");

const brandList = document.getElementById("brandList");

const cartButton = document.getElementById("cartButton");
const cartPanel = document.getElementById("cartPanel");
const cartClose = document.getElementById("cartClose");
const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");

const deliveryOption = document.getElementById("deliveryOption");
const addressBlock = document.getElementById("addressBlock");
const addressInput = document.getElementById("address");
const checkoutWhatsApp = document.getElementById("checkoutWhatsApp");
const whatsappHero = document.getElementById("whatsapp-hero");
const whatsappLink = document.getElementById("whatsappLink");
const fabWhatsApp = document.getElementById("fabWhatsApp");

// 4) Helpers
const money = (n) => `€${Number(n).toFixed(2)}`;
const enc = (s) => encodeURIComponent(s);

// Parse "Merk | Product | Prijs | Foto"
function parseList(text){
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  return lines.map(line => {
    const [brand="", name="", priceRaw="", linkRaw=""] = line.split("|").map(p => p.trim());
    let price = null;
    if (priceRaw && priceRaw !== "—" && priceRaw !== "-") {
      const n = Number(priceRaw.replace(",", "."));
      if (!isNaN(n)) price = n;
    }
    const link = (linkRaw && !/\[link\]/i.test(linkRaw)) ? linkRaw : FALLBACK_IMG;
    return { brand, name, price, link };
  });
}

// 5) Render grid + pagination
function renderGrid(){
  if (!productGrid) return;
  productGrid.innerHTML = "";

  const total = filtered.length;
  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  page = Math.min(page, maxPage);

  const start = (page - 1) * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);

  slice.forEach(p => {
    const card = document.createElement("article");
    card.className = "card";
    const priceLabel = p.price != null ? money(p.price) : "Prijs op aanvraag";
    card.innerHTML = `
      <img class="card-img" src="${p.link}" alt="${p.brand} ${p.name}" loading="lazy" onerror="this.src='${FALLBACK_IMG}'" />
      <div class="card-body">
        <h3 class="card-title">${p.brand} — ${p.name}</h3>
        <p class="card-meta">${p.price != null ? "Direct bestelbaar" : "Neem contact op voor prijs"}</p>
        <p class="price-main">${priceLabel}</p>
        <div class="card-actions">
          <button class="btn btn-ghost" data-add>In mandje</button>
          <a class="btn btn-primary" href="${waLinkSingle(p)}" target="_blank" rel="noopener">WhatsApp</a>
        </div>
      </div>
    `;
    card.querySelector("[data-add]").addEventListener("click", () => addToCart(p));
    productGrid.appendChild(card);
  });

  pageInfo.textContent = `Pagina ${page} van ${maxPage} — totaal ${total}`;
  prevPage.disabled = page <= 1;
  nextPage.disabled = page >= maxPage;
}

// 6) Filters, merken, zoeken
function initBrands(){
  const brands = Array.from(new Set(products.map(p => p.brand))).sort();
  filterBrand.innerHTML = `<option value="">Alle merken</option>` + brands.map(b => `<option value="${b}">${b}</option>`).join("");
  brandList.innerHTML = brands.map(b => `<button class="brand-pill" data-brand="${b}">${b}</button>`).join("");
  brandList.querySelectorAll(".brand-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      filterBrand.value = btn.dataset.brand;
      applyFilters();
      showSection("shop");
    });
  });
}
function applyFilters(){
  const q = (searchInput?.value || "").toLowerCase();
  const brand = filterBrand?.value || "";
  let list = [...products];
  if (brand) list = list.filter(p => p.brand === brand);
  if (q) list = list.filter(p => p.brand.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
  filtered = list;
  page = 1;
  renderGrid();
}

// 7) Cart
function addToCart(p){
  const i = cart.findIndex(x => x.brand === p.brand && x.name === p.name);
  if (i >= 0) cart[i].qty += 1;
  else cart.push({ ...p, qty: 1 });
  updateCart();
}
function updateCart(){
  cartItems.innerHTML = "";
  let total = 0;
  cart.forEach((item, idx) => {
    const line = item.price != null ? item.price * item.qty : 0;
    total += line;
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <div class="muted">${item.brand} — ${item.name}</div>
      <div class="cart-actions">
        <button class="qty" data-minus>-</button>
        <span>${item.qty}</span>
        <button class="qty" data-plus>+</button>
        <button class="remove" data-remove>✕</button>
      </div>
    `;
    row.querySelector("[data-minus]").addEventListener("click", () => { item.qty = Math.max(1, item.qty - 1); updateCart(); });
    row.querySelector("[data-plus]").addEventListener("click", () => { item.qty += 1; updateCart(); });
    row.querySelector("[data-remove]").addEventListener("click", () => { cart.splice(idx,1); updateCart(); });
    cartItems.appendChild(row);
  });
  cartCount.textContent = cart.reduce((s,i)=> s+i.qty, 0);
  cartTotal.textContent = money(total);
}

// 8) Checkout via WhatsApp
function waLinkSingle(p){
  const pricePart = p.price != null ? ` (${money(p.price)})` : "";
  const msg = `Bestelling REAL‑SCENTS:\n• ${p.brand} — ${p.name}${pricePart}`;
  return `https://wa.me/${WHATSAPP_NUMBER.replace('+','')}?text=${enc(msg)}`;
}
function waCheckoutCart(){
  if (!cart.length) return;
  const lines = cart.map(i => `• ${i.brand} — ${i.name} ×${i.qty} ${i.price != null ? `(${money(i.price)})` : ""}`.trim());
  const total = cart.reduce((s,i)=> s + (i.price != null ? i.price * i.qty : 0), 0);
  const delivery = deliveryOption.value;
  const address = addressInput.value.trim();
  const addressLine = delivery === "levering" ? `\nAdres: ${address || "—"}` : `\nAfhalen: ja`;
  const msg = `Bestelling REAL‑SCENTS:\n${lines.join("\n")}\n\nTotaal: ${money(total)}\nLevering: ${delivery}${addressLine}`;
  const url = `https://wa.me/${WHATSAPP_NUMBER.replace('+','')}?text=${enc(msg)}`;
  window.open(url, "_blank", "noopener");
}

// 9) UI events
navLinks.addEventListener("click", (e) => {
  const a = e.target.closest("a.nav-link");
  if (!a) return;
  e.preventDefault();
  showSection(a.getAttribute("href").replace("#", ""));
  closeMenu();
});

// Knoppen en links buiten het menu (hero, footer, logo) navigeren via data-goto
document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-goto]");
  if (!link) return;
  e.preventDefault();
  showSection(link.dataset.goto);
});

function showSection(id){
  sections.forEach(s => s.classList.toggle("visible", s.id === id));
  navLinks.querySelectorAll(".nav-link").forEach(x => {
    x.classList.toggle("active", x.getAttribute("href") === `#${id}`);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

hamburger.addEventListener("click", () => {
  const open = navLinks.classList.toggle("show");
  hamburger.setAttribute("aria-expanded", String(open));
});

cartButton.addEventListener("click", () => cartPanel.classList.add("open"));
cartClose.addEventListener("click", () => cartPanel.classList.remove("open"));

deliveryOption.addEventListener("change", () => {
  const showAddr = deliveryOption.value === "levering";
  addressBlock.style.display = showAddr ? "block" : "none";
});

checkoutWhatsApp.addEventListener("click", waCheckoutCart);

whatsappHero.addEventListener("click", (e) => {
  e.preventDefault();
  const msg = enc("Hallo, ik wil graag bestellen bij REAL‑SCENTS.");
  window.open(`https://wa.me/${WHATSAPP_NUMBER.replace('+','')}?text=${msg}`, "_blank", "noopener");
});

whatsappLink.setAttribute("href", `https://wa.me/${WHATSAPP_NUMBER.replace('+','')}`);
fabWhatsApp.setAttribute("href", `https://wa.me/${WHATSAPP_NUMBER.replace('+','')}`);

// 10) Pagination
function gotoPage(next){
  const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const target = Math.min(Math.max(1, next), maxPage);
  if (target === page) return;
  page = target;
  renderGrid();
  document.querySelector(".section.visible")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
prevPage.addEventListener("click", () => gotoPage(page - 1));
nextPage.addEventListener("click", () => gotoPage(page + 1));

// 11) Init
products = parseList(RAW_LIST);         // laad vooraf
initBrands();
filtered = [...products];
renderGrid();
updateCart();
showSection("home");

// Zoek en filter live
searchInput.addEventListener("input", applyFilters);
filterBrand.addEventListener("change", applyFilters);

// 12) Kleine UI-verbeteringen voor het luxe thema
const siteHeader = document.getElementById("siteHeader");
const setHeaderState = () => {
  siteHeader.classList.toggle("scrolled", window.scrollY > 24);
};
setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

// Winkelmandje sluiten met Escape
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  cartPanel.classList.remove("open");
  closeMenu();
});

// Next.js verklaart wel *.module.css maar niet gewone stylesheets. TypeScript 6
// vraagt daar sinds kort expliciet om bij een import zonder naam
// (`import "./globals.css"`), vandaar deze aanvulling.
declare module "*.css";

export default {
  title: "US Prediction Markets",
  base: "/kalshi-dashboard/",
  root: "src",
  pages: [
    {name: "Overview", path: "/"},
    {name: "Kalshi Volume", path: "/volume"},
    {name: "Categories", path: "/categories"},
    {name: "Parlay P&L", path: "/parlay"},
    {name: "Calibration", path: "/calibration"},
  ],
  footer: "Data: Kalshi trade records via InGame. Updated nightly.",
};

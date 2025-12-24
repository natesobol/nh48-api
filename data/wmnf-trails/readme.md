WMNF Trails JSON data powering the WMNF Trails App and map embeds.

Core datasets (primary API sources):

* `wmnf-main.json` – normalized White Mountain trail network (New Hampshire coverage)
* `wmnf-pliney.json` – Pliney region segments
* `wmnf-maine.json` – Maine-side WMNF trail inventory
* `NH2000ftpeaks.json` – White Mountain 2,000-foot peak list used alongside the trail data

These JSON files are versioned independently from the NH48 peaks set so they can be
indexed as a dedicated WMNF dataset for downstream consumers, search engines, and
GIS tooling.

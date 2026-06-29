export class ObjectManager {
  filename = 'objects_0_BB.json';
  objects = {};

  constructor(app) {
    this.app = app;
  };

  fundById(id) {
    this.objects = fs.readFileSync(`${this.app.datapath}/${this.filename}`);
    return this.objects[id] ?? [];
  };

  finfByName(name) {
    this.index = fs.readFileSync(`${this.app.datapath}/'name.json`);
  };

};

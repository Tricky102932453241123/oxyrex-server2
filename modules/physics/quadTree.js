class QuadTree {
    constructor(bounds, max_objects, max_levels, level) {
        this.maxObjects = max_objects || 25;
        this.maxLevels = max_levels || 5;
        this.level = level || 0;
        this.bounds = bounds;
        if (this.bounds.x == null || this.bounds.y == null) this.bounds.x = this.bounds.y = 0;
        this.objects = [];
        this.branches = [];
    }
    split() {
        let nextLevel = this.level + 1;
        let subWidth = this.bounds.width / 2;
        let subHeight = this.bounds.height / 2;
        let x = this.bounds.x;
        let y = this.bounds.y;
        this.branches.push(new QuadTree({
            x: x,
            y: y,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, nextLevel));
        this.branches.push(new QuadTree({
            x: x + subWidth,
            y: y,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, nextLevel));
        this.branches.push(new QuadTree({
            x: x,
            y: y + subHeight,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, nextLevel));
        this.branches.push(new QuadTree({
            x: x + subWidth,
            y: y + subHeight,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, nextLevel));
    }
    getBranches(object) {
        let output = [];
        let midX = this.bounds.x + (this.bounds.width / 2);
        let midY = this.bounds.y + (this.bounds.height / 2);
        let north = object.y - object.size <= midY;
        let south = object.y - object.size >= midY;
        let east = object.x + object.size >= midX;
        let west = object.x + object.size <= midX;
        if (north && west) output.push(0);
        if (north && east) output.push(1);
        if (south && west) output.push(2);
        if (south && east) output.push(3);
        return output;
    }
    insert(object) {
        let i = 0;
        let cells;
        if (this.branches.length) {
            cells = this.getBranches(object);
            for (i = 0; i < cells.length; i++) this.branches[cells[i]].insert(object);
            return;
        }
        this.objects.push(object);
        if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
            if (!this.branches.length) this.split();
            for (i = 0; i < this.objects.length; i++) {
                cells = this.getBranches(this.objects[i]);
                for (let j = 0; j < cells.length; j++) this.branches[cells[j]].insert(this.objects[i]);
            }
            this.objects = [];
        }
    }
    retrieve(object) {
        let cells = this.getBranches(object);
        let output = this.objects;
        if (this.branches.length)
            for (let i = 0; i < cells.length; i++) output = output.concat(this.branches[cells[i]].retrieve(object));
        let realOutput = [];
        for (let i = 0; i < output.length; i ++) if (!realOutput.includes(output[i])) realOutput.push(output[i]);
        return output;
    }
    clear() {
        this.objects = [];
        if (this.branches.length) {
            for (let i = 0; i < this.branches.length; i++) this.branches[i].clear();
            this.branches = [];
        }
    }
}
module.exports = QuadTree;

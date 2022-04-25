if (c.minifyModules) {
    ! function(t) {
        function e(t, e) {
            var i = t.getAABB(),
                s = e.getAABB();
            return !(!i.active && !s.active) && !(i.min[0] > s.max[0] || i.min[1] > s.max[1] || i.max[0] < s.min[0] || i.max[1] < s.min[1])
        }

        function i(t, e) {
            return Math.max(Math.abs(e[0] - t[0]), Math.abs(e[1] - t[1]))
        }

        function s() {
            this.MAX_OBJECT_CELL_DENSITY = 1 / 8, this.INITIAL_GRID_LENGTH = 256, this.HIERARCHY_FACTOR = 2, this.HIERARCHY_FACTOR_SQRT = Math.SQRT2, this._grids = [], this._globalObjects = []
        }

        function l(t, e, i) {
            this.cellSize = t, this.inverseCellSize = 1 / t, this.rowColumnCount = ~~Math.sqrt(e), this.xyHashMask = this.rowColumnCount - 1, this.occupiedCells = [], this.allCells = Array(this.rowColumnCount * this.rowColumnCount), this.allObjects = [], this.sharedInnerOffsets = [], this._parentHierarchy = i || null
        }

        function n() {
            this.objectContainer = [], this.neighborOffsetArray, this.occupiedCellsIndex = null, this.allCellsIndex = null
        }
        s.prototype.addObject = function(t) {
            var e, s, n, o, h = t.getAABB(),
                r = i(h.min, h.max);
            if (t.HSHG = {
                    globalObjectsIndex: this._globalObjects.length
                }, this._globalObjects.push(t), 0 === this._grids.length)(o = new l(r * this.HIERARCHY_FACTOR_SQRT, this.INITIAL_GRID_LENGTH, this)).initCells(), o.addObject(t), this._grids.push(o);
            else {
                for (e = 0, s = 0; s < this._grids.length; s++)
                    if (r < (e = (n = this._grids[s]).cellSize)) {
                        if (r < (e /= this.HIERARCHY_FACTOR)) {
                            for (; r < e;) e /= this.HIERARCHY_FACTOR;
                            (o = new l(e * this.HIERARCHY_FACTOR, this.INITIAL_GRID_LENGTH, this)).initCells(), o.addObject(t), this._grids.splice(s, 0, o)
                        } else n.addObject(t);
                        return
                    } for (; r >= e;) e *= this.HIERARCHY_FACTOR;
                (o = new l(e, this.INITIAL_GRID_LENGTH, this)).initCells(), o.addObject(t), this._grids.push(o)
            }
        }, s.prototype.checkIfInHSHG = function(t) {
            return void 0 !== t.HSHG
        }, s.prototype.removeObject = function(t) {
            var e, i, s = t.HSHG;
            if (void 0 === s) throw Error(t + " was not in the HSHG.");
            (e = s.globalObjectsIndex) === this._globalObjects.length - 1 ? this._globalObjects.pop() : ((i = this._globalObjects.pop()).HSHG.globalObjectsIndex = e, this._globalObjects[e] = i), s.grid.removeObject(t), delete t.HSHG
        }, s.prototype.update = function() {
            var t, e, i, s, l, n;
            for (t = 0; t < this._globalObjects.length; t++) i = (s = (e = this._globalObjects[t]).HSHG).grid, l = e.getAABB(), (n = i.toHash(l.min[0], l.min[1])) !== s.hash && (i.removeObject(e), i.addObject(e, n))
        }, s.prototype.queryForCollisionPairs = function() {
            var t, i, s, l, n, o, h, r, a, c, C, u, d, b, g = [];
            for (t = 0; t < this._grids.length; t++) {
                for (o = this._grids[t], i = 0; i < o.occupiedCells.length; i++) {
                    for (h = o.occupiedCells[i], s = 0; s < h.objectContainer.length; s++)
                        if ((r = h.objectContainer[s]).getAABB().active)
                            for (l = s + 1; l < h.objectContainer.length; l++)(a = h.objectContainer[l]).getAABB().active && !0 === e(r, a) && g.push([r, a]);
                    for (n = 0; n < 4; n++)
                        for (c = h.neighborOffsetArray[n], C = o.allCells[h.allCellsIndex + c], s = 0; s < h.objectContainer.length; s++)
                            if ((r = h.objectContainer[s]).getAABB().active)
                                for (l = 0; l < C.objectContainer.length; l++)(a = C.objectContainer[l]).getAABB().active && !0 === e(r, a) && g.push([r, a])
                }
                for (i = 0; i < o.allObjects.length; i++)
                    if ((d = (r = o.allObjects[i]).getAABB()).active)
                        for (s = t + 1; s < this._grids.length; s++)
                            for (b = (u = this._grids[s]).toHash(d.min[0], d.min[1]), h = u.allCells[b], n = 0; n < h.neighborOffsetArray.length; n++)
                                for (c = h.neighborOffsetArray[n], C = u.allCells[h.allCellsIndex + c], l = 0; l < C.objectContainer.length; l++)(a = C.objectContainer[l]).getAABB().active && !0 === e(r, a) && g.push([r, a])
            }
            return g
        }, l.prototype.initCells = function() {
            var t, e, i, s, l, o, h, r, a, c, C, u, d = this.allCells.length,
                b = this.rowColumnCount,
                g = [b - 1, b, b + 1, -1, 0, 1, -1 - b, -b, 1 - b],
                p = [];
            for (this.sharedInnerOffsets = g, t = 0; t < d; t++) u = new n, s = !1, l = !1, o = !1, h = !1, ((e = ~~(t - (i = ~~(t / this.rowColumnCount)) * this.rowColumnCount)) + 1) % this.rowColumnCount == 0 ? s = !0 : e % this.rowColumnCount == 0 && (l = !0), (i + 1) % this.rowColumnCount == 0 ? o = !0 : i % this.rowColumnCount == 0 && (h = !0), s || l || o || h ? (p = [(r = !0 === l ? b - 1 : -1) + (c = !0 === o ? -d + b : b), c, (a = !0 === s ? 1 - b : 1) + c, r, 0, a, r + (C = !0 === h ? d - b : -b), C, a + C], u.neighborOffsetArray = p) : u.neighborOffsetArray = this.sharedInnerOffsets, u.allCellsIndex = t, this.allCells[t] = u
        }, l.prototype.toHash = function(t, e, i) {
            var s, l, n;
            return t < 0 ? (s = -t * this.inverseCellSize, l = this.rowColumnCount - 1 - (~~s & this.xyHashMask)) : l = ~~(s = t * this.inverseCellSize) & this.xyHashMask, e < 0 ? (s = -e * this.inverseCellSize, n = this.rowColumnCount - 1 - (~~s & this.xyHashMask)) : n = ~~(s = e * this.inverseCellSize) & this.xyHashMask, l + n * this.rowColumnCount
        }, l.prototype.addObject = function(t, e) {
            var i, s, l;
            void 0 !== e ? s = e : (i = t.getAABB(), s = this.toHash(i.min[0], i.min[1])), 0 === (l = this.allCells[s]).objectContainer.length && (l.occupiedCellsIndex = this.occupiedCells.length, this.occupiedCells.push(l)), t.HSHG.objectContainerIndex = l.objectContainer.length, t.HSHG.hash = s, t.HSHG.grid = this, t.HSHG.allGridObjectsIndex = this.allObjects.length, l.objectContainer.push(t), this.allObjects.push(t), this.allObjects.length / this.allCells.length > this._parentHierarchy.MAX_OBJECT_CELL_DENSITY && this.expandGrid()
        }, l.prototype.removeObject = function(t) {
            var e, i, s, l, n, o, h = t.HSHG;
            e = h.hash, i = h.objectContainerIndex, s = h.allGridObjectsIndex, 1 === (l = this.allCells[e]).objectContainer.length ? (l.objectContainer.length = 0, l.occupiedCellsIndex === this.occupiedCells.length - 1 ? this.occupiedCells.pop() : ((n = this.occupiedCells.pop()).occupiedCellsIndex = l.occupiedCellsIndex, this.occupiedCells[l.occupiedCellsIndex] = n), l.occupiedCellsIndex = null) : i === l.objectContainer.length - 1 ? l.objectContainer.pop() : ((o = l.objectContainer.pop()).HSHG.objectContainerIndex = i, l.objectContainer[i] = o), s === this.allObjects.length - 1 ? this.allObjects.pop() : ((o = this.allObjects.pop()).HSHG.allGridObjectsIndex = s, this.allObjects[s] = o)
        }, l.prototype.expandGrid = function() {
            var t, e = this.allCells.length,
                i = (this.rowColumnCount, this.xyHashMask, 4 * e),
                s = ~~Math.sqrt(i),
                l = s - 1,
                n = this.allObjects.slice(0);
            Array.prototype.push;
            for (t = 0; t < n.length; t++) this.removeObject(n[t]);
            for (this.rowColumnCount = s, this.allCells = Array(this.rowColumnCount * this.rowColumnCount), this.xyHashMask = l, this.initCells(), t = 0; t < n.length; t++) this.addObject(n[t])
        }, t.HSHG = s, s._private = {
            Grid: l,
            Cell: n,
            testAABBOverlap: e,
            getLongestAABBEdge: i
        }
    }(this);
} else {
    // Hierarchical Spatial Hash Grid: HSHG
    // Hierarchical Spatial Hash Grid: HSHG
    // https://gist.github.com/kirbysayshi/1760774
    (function(root) {
        //---------------------------------------------------------------------
        // GLOBAL FUNCTIONS
        //---------------------------------------------------------------------
        function testAABBOverlap(objA, objB) {
            var a = objA.getAABB(),
                b = objB.getAABB();
            //if(a.min[0] > b.max[0] || a.min[1] > b.max[1] || a.min[2] > b.max[2]
            //|| a.max[0] < b.min[0] || a.max[1] < b.min[1] || a.max[2] < b.min[2]){
            if (!a.active && !b.active) return false;
            if (a.min[0] > b.max[0] || a.min[1] > b.max[1] || a.max[0] < b.min[0] || a.max[1] < b.min[1]) {
                return false;
            } else {
                return true;
            }
        }

        function getLongestAABBEdge(min, max) {
            return Math.max(Math.abs(max[0] - min[0]), Math.abs(max[1] - min[1])
                //,Math.abs(max[2] - min[2])
            );
        }
        //---------------------------------------------------------------------
        // ENTITIES
        //---------------------------------------------------------------------
        function HSHG() {
            this.MAX_OBJECT_CELL_DENSITY = 1 / 8 // objects / cells
            this.INITIAL_GRID_LENGTH = 256 // 16x16
            this.HIERARCHY_FACTOR = 2
            this.HIERARCHY_FACTOR_SQRT = Math.SQRT2
            this._grids = [];
            this._globalObjects = [];
        }
        //HSHG.prototype.init = function(){
        //  this._grids = [];
        //  this._globalObjects = [];
        //}
        HSHG.prototype.addObject = function(obj) {
            var x, i, cellSize, objAABB = obj.getAABB(),
                objSize = getLongestAABBEdge(objAABB.min, objAABB.max),
                oneGrid, newGrid;
            // for HSHG metadata
            obj.HSHG = {
                globalObjectsIndex: this._globalObjects.length
            };
            // add to global object array
            this._globalObjects.push(obj);
            if (this._grids.length === 0) {
                // no grids exist yet
                cellSize = objSize * this.HIERARCHY_FACTOR_SQRT;
                newGrid = new Grid(cellSize, this.INITIAL_GRID_LENGTH, this);
                newGrid.initCells();
                newGrid.addObject(obj);
                this._grids.push(newGrid);
            } else {
                x = 0;
                // grids are sorted by cellSize, smallest to largest
                for (i = 0; i < this._grids.length; i++) {
                    oneGrid = this._grids[i];
                    x = oneGrid.cellSize;
                    if (objSize < x) {
                        x = x / this.HIERARCHY_FACTOR;
                        if (objSize < x) {
                            // find appropriate size
                            while (objSize < x) {
                                x = x / this.HIERARCHY_FACTOR;
                            }
                            newGrid = new Grid(x * this.HIERARCHY_FACTOR, this.INITIAL_GRID_LENGTH, this);
                            newGrid.initCells();
                            // assign obj to grid
                            newGrid.addObject(obj)
                            // insert grid into list of grids directly before oneGrid
                            this._grids.splice(i, 0, newGrid);
                        } else {
                            // insert obj into grid oneGrid
                            oneGrid.addObject(obj);
                        }
                        return;
                    }
                }
                while (objSize >= x) {
                    x = x * this.HIERARCHY_FACTOR;
                }
                newGrid = new Grid(x, this.INITIAL_GRID_LENGTH, this);
                newGrid.initCells();
                // insert obj into grid
                newGrid.addObject(obj)
                // add newGrid as last element in grid list
                this._grids.push(newGrid);
            }
        }
        HSHG.prototype.checkIfInHSHG = function(obj) {
            var meta = obj.HSHG,
                globalObjectsIndex, replacementObj;
            if (meta === undefined) return false;
            return true;
        }
        HSHG.prototype.removeObject = function(obj) {
            var meta = obj.HSHG,
                globalObjectsIndex, replacementObj;
            if (meta === undefined) {
                throw Error(obj + ' was not in the HSHG.');
                return;
            }
            // remove object from global object list
            globalObjectsIndex = meta.globalObjectsIndex
            if (globalObjectsIndex === this._globalObjects.length - 1) {
                this._globalObjects.pop();
            } else {
                replacementObj = this._globalObjects.pop();
                replacementObj.HSHG.globalObjectsIndex = globalObjectsIndex;
                this._globalObjects[globalObjectsIndex] = replacementObj;
            }
            meta.grid.removeObject(obj);
            // remove meta data
            delete obj.HSHG;
        }
        /**
         * Updates every object's position in the grid, but only if
         * the hash value for that object has changed.
         * This method DOES NOT take into account object expansion or
         * contraction, just position, and does not attempt to change
         * the grid the object is currently in; it only (possibly) changes
         * the cell.
         *
         * If the object has significantly changed in size, the best bet is to
         * call removeObject() and addObject() sequentially, outside of the
         * normal update cycle of HSHG.
         *
         * @return  void   desc
         */
        HSHG.prototype.update = function() {
            var i, obj, grid, meta, objAABB, newObjHash;
            // for each object
            for (i = 0; i < this._globalObjects.length; i++) {
                obj = this._globalObjects[i];
                meta = obj.HSHG;
                grid = meta.grid;
                // recompute hash
                objAABB = obj.getAABB();
                newObjHash = grid.toHash(objAABB.min[0], objAABB.min[1]);
                if (newObjHash !== meta.hash) {
                    // grid position has changed, update!
                    grid.removeObject(obj);
                    grid.addObject(obj, newObjHash);
                }
            }
        }
        HSHG.prototype.queryForCollisionPairs = function() {
            var i, j, k, l, c, grid, cell, objA, objB, offset, adjacentCell, biggerGrid, objAAABB, objAHashInBiggerGrid, possibleCollisions = []
            // for all grids ordered by cell size ASC
            for (i = 0; i < this._grids.length; i++) {
                grid = this._grids[i];
                // for each cell of the grid that is occupied
                for (j = 0; j < grid.occupiedCells.length; j++) {
                    cell = grid.occupiedCells[j];
                    // collide all objects within the occupied cell
                    for (k = 0; k < cell.objectContainer.length; k++) {
                        objA = cell.objectContainer[k];
                        if (!objA.getAABB().active) continue;
                        for (l = k + 1; l < cell.objectContainer.length; l++) {
                            objB = cell.objectContainer[l];
                            if (!objB.getAABB().active) continue;
                            if (testAABBOverlap(objA, objB) === true) {
                                possibleCollisions.push([objA, objB]);
                            }
                        }
                    }
                    // for the first half of all adjacent cells (offset 4 is the current cell)
                    for (c = 0; c < 4; c++) {
                        offset = cell.neighborOffsetArray[c];
                        //if(offset === null) { continue; }
                        adjacentCell = grid.allCells[cell.allCellsIndex + offset];
                        // collide all objects in cell with adjacent cell
                        for (k = 0; k < cell.objectContainer.length; k++) {
                            objA = cell.objectContainer[k];
                            if (!objA.getAABB().active) continue;
                            for (l = 0; l < adjacentCell.objectContainer.length; l++) {
                                objB = adjacentCell.objectContainer[l];
                                if (!objB.getAABB().active) continue;
                                if (testAABBOverlap(objA, objB) === true) {
                                    possibleCollisions.push([objA, objB]);
                                }
                            }
                        }
                    }
                }
                // forall objects that are stored in this grid
                for (j = 0; j < grid.allObjects.length; j++) {
                    objA = grid.allObjects[j];
                    objAAABB = objA.getAABB();
                    if (!objAAABB.active) continue;
                    // for all grids with cellsize larger than grid
                    for (k = i + 1; k < this._grids.length; k++) {
                        biggerGrid = this._grids[k];
                        objAHashInBiggerGrid = biggerGrid.toHash(objAAABB.min[0], objAAABB.min[1]);
                        cell = biggerGrid.allCells[objAHashInBiggerGrid];
                        // check objA against every object in all cells in offset array of cell
                        // for all adjacent cells...
                        for (c = 0; c < cell.neighborOffsetArray.length; c++) {
                            offset = cell.neighborOffsetArray[c];
                            //if(offset === null) { continue; }
                            adjacentCell = biggerGrid.allCells[cell.allCellsIndex + offset];
                            // for all objects in the adjacent cell...
                            for (l = 0; l < adjacentCell.objectContainer.length; l++) {
                                objB = adjacentCell.objectContainer[l];
                                if (!objB.getAABB().active) continue;
                                // test against object A
                                if (testAABBOverlap(objA, objB) === true) {
                                    possibleCollisions.push([objA, objB]);
                                }
                            }
                        }
                    }
                }
            }
            // return list of object pairs
            return possibleCollisions;
        }
        /**
         * Grid
         *
         * @constructor
         * @param   int cellSize  the pixel size of each cell of the grid
         * @param   int cellCount  the total number of cells for the grid (width x height)
         * @param   HSHG parentHierarchy    the HSHG to which this grid belongs
         * @return  void
         */
        function Grid(cellSize, cellCount, parentHierarchy) {
            this.cellSize = cellSize;
            this.inverseCellSize = 1 / cellSize;
            this.rowColumnCount = ~~Math.sqrt(cellCount);
            this.xyHashMask = this.rowColumnCount - 1;
            this.occupiedCells = [];
            this.allCells = Array(this.rowColumnCount * this.rowColumnCount);
            this.allObjects = [];
            this.sharedInnerOffsets = [];
            this._parentHierarchy = parentHierarchy || null;
        }
        Grid.prototype.initCells = function() {
            // TODO: inner/unique offset rows 0 and 2 may need to be
            // swapped due to +y being "down" vs "up"
            var i, gridLength = this.allCells.length,
                x, y, wh = this.rowColumnCount,
                isOnRightEdge, isOnLeftEdge, isOnTopEdge, isOnBottomEdge, innerOffsets = [
                    // y+ down offsets
                    //-1 + -wh, -wh, -wh + 1,
                    //-1, 0, 1,
                    //wh - 1, wh, wh + 1
                    // y+ up offsets
                    wh - 1, wh, wh + 1, -1, 0, 1, -1 + -wh, -wh, -wh + 1
                ],
                leftOffset, rightOffset, topOffset, bottomOffset, uniqueOffsets = [],
                cell;
            this.sharedInnerOffsets = innerOffsets;
            // init all cells, creating offset arrays as needed
            for (i = 0; i < gridLength; i++) {
                cell = new Cell();
                // compute row (y) and column (x) for an index
                y = ~~(i / this.rowColumnCount);
                x = ~~(i - (y * this.rowColumnCount));
                // reset / init
                isOnRightEdge = false;
                isOnLeftEdge = false;
                isOnTopEdge = false;
                isOnBottomEdge = false;
                // right or left edge cell
                if ((x + 1) % this.rowColumnCount === 0) {
                    isOnRightEdge = true;
                } else if (x % this.rowColumnCount === 0) {
                    isOnLeftEdge = true;
                }
                // top or bottom edge cell
                if ((y + 1) % this.rowColumnCount === 0) {
                    isOnTopEdge = true;
                } else if (y % this.rowColumnCount === 0) {
                    isOnBottomEdge = true;
                }
                // if cell is edge cell, use unique offsets, otherwise use inner offsets
                if (isOnRightEdge || isOnLeftEdge || isOnTopEdge || isOnBottomEdge) {
                    // figure out cardinal offsets first
                    rightOffset = isOnRightEdge === true ? -wh + 1 : 1;
                    leftOffset = isOnLeftEdge === true ? wh - 1 : -1;
                    topOffset = isOnTopEdge === true ? -gridLength + wh : wh;
                    bottomOffset = isOnBottomEdge === true ? gridLength - wh : -wh;
                    // diagonals are composites of the cardinals
                    uniqueOffsets = [
                        // y+ down offset
                        //leftOffset + bottomOffset, bottomOffset, rightOffset + bottomOffset,
                        //leftOffset, 0, rightOffset,
                        //leftOffset + topOffset, topOffset, rightOffset + topOffset
                        // y+ up offset
                        leftOffset + topOffset, topOffset, rightOffset + topOffset,
                        leftOffset, 0, rightOffset,
                        leftOffset + bottomOffset, bottomOffset, rightOffset + bottomOffset
                    ];
                    cell.neighborOffsetArray = uniqueOffsets;
                } else {
                    cell.neighborOffsetArray = this.sharedInnerOffsets;
                }
                cell.allCellsIndex = i;
                this.allCells[i] = cell;
            }
        }
        Grid.prototype.toHash = function(x, y, z) {
            var i, xHash, yHash, zHash;
            if (x < 0) {
                i = (-x) * this.inverseCellSize;
                xHash = this.rowColumnCount - 1 - (~~i & this.xyHashMask);
            } else {
                i = x * this.inverseCellSize;
                xHash = ~~i & this.xyHashMask;
            }
            if (y < 0) {
                i = (-y) * this.inverseCellSize;
                yHash = this.rowColumnCount - 1 - (~~i & this.xyHashMask);
            } else {
                i = y * this.inverseCellSize;
                yHash = ~~i & this.xyHashMask;
            }
            //if(z < 0){
            //  i = (-z) * this.inverseCellSize;
            //  zHash = this.rowColumnCount - 1 - ( ~~i & this.xyHashMask );
            //} else {
            //  i = z * this.inverseCellSize;
            //  zHash = ~~i & this.xyHashMask;
            //}
            return xHash + yHash * this.rowColumnCount
            //+ zHash * this.rowColumnCount * this.rowColumnCount;
        }
        Grid.prototype.addObject = function(obj, hash) {
            var objAABB, objHash, targetCell;
            // technically, passing this in this should save some computational effort when updating objects
            if (hash !== undefined) {
                objHash = hash;
            } else {
                objAABB = obj.getAABB()
                objHash = this.toHash(objAABB.min[0], objAABB.min[1])
            }
            targetCell = this.allCells[objHash];
            if (targetCell.objectContainer.length === 0) {
                // insert this cell into occupied cells list
                targetCell.occupiedCellsIndex = this.occupiedCells.length;
                this.occupiedCells.push(targetCell);
            }
            // add meta data to obj, for fast update/removal
            obj.HSHG.objectContainerIndex = targetCell.objectContainer.length;
            obj.HSHG.hash = objHash;
            obj.HSHG.grid = this;
            obj.HSHG.allGridObjectsIndex = this.allObjects.length;
            // add obj to cell
            targetCell.objectContainer.push(obj);
            // we can assume that the targetCell is already a member of the occupied list
            // add to grid-global object list
            this.allObjects.push(obj);
            // do test for grid density
            if (this.allObjects.length / this.allCells.length > this._parentHierarchy.MAX_OBJECT_CELL_DENSITY) {
                // grid must be increased in size
                this.expandGrid();
            }
        }
        Grid.prototype.removeObject = function(obj) {
            var meta = obj.HSHG,
                hash, containerIndex, allGridObjectsIndex, cell, replacementCell, replacementObj;
            hash = meta.hash;
            containerIndex = meta.objectContainerIndex;
            allGridObjectsIndex = meta.allGridObjectsIndex;
            cell = this.allCells[hash];
            // remove object from cell object container
            if (cell.objectContainer.length === 1) {
                // this is the last object in the cell, so reset it
                cell.objectContainer.length = 0;
                // remove cell from occupied list
                if (cell.occupiedCellsIndex === this.occupiedCells.length - 1) {
                    // special case if the cell is the newest in the list
                    this.occupiedCells.pop();
                } else {
                    replacementCell = this.occupiedCells.pop();
                    replacementCell.occupiedCellsIndex = cell.occupiedCellsIndex;
                    this.occupiedCells[cell.occupiedCellsIndex] = replacementCell;
                }
                cell.occupiedCellsIndex = null;
            } else {
                // there is more than one object in the container
                if (containerIndex === cell.objectContainer.length - 1) {
                    // special case if the obj is the newest in the container
                    cell.objectContainer.pop();
                } else {
                    replacementObj = cell.objectContainer.pop();
                    replacementObj.HSHG.objectContainerIndex = containerIndex;
                    cell.objectContainer[containerIndex] = replacementObj;
                }
            }
            // remove object from grid object list
            if (allGridObjectsIndex === this.allObjects.length - 1) {
                this.allObjects.pop();
            } else {
                replacementObj = this.allObjects.pop();
                replacementObj.HSHG.allGridObjectsIndex = allGridObjectsIndex;
                this.allObjects[allGridObjectsIndex] = replacementObj;
            }
        }
        Grid.prototype.expandGrid = function() {
            var i, j, currentCellCount = this.allCells.length,
                currentRowColumnCount = this.rowColumnCount,
                currentXYHashMask = this.xyHashMask,
                newCellCount = currentCellCount * 4 // double each dimension
                ,
                newRowColumnCount = ~~Math.sqrt(newCellCount),
                newXYHashMask = newRowColumnCount - 1,
                allObjects = this.allObjects.slice(0) // duplicate array, not objects contained
                ,
                aCell, push = Array.prototype.push;
            // remove all objects
            for (i = 0; i < allObjects.length; i++) {
                this.removeObject(allObjects[i]);
            }
            // reset grid values, set new grid to be 4x larger than last
            this.rowColumnCount = newRowColumnCount;
            this.allCells = Array(this.rowColumnCount * this.rowColumnCount);
            this.xyHashMask = newXYHashMask;
            // initialize new cells
            this.initCells();
            // re-add all objects to grid
            for (i = 0; i < allObjects.length; i++) {
                this.addObject(allObjects[i]);
            }
        }
        /**
         * A cell of the grid
         *
         * @constructor
         * @return  void   desc
         */
        function Cell() {
            this.objectContainer = [];
            this.neighborOffsetArray;
            this.occupiedCellsIndex = null;
            this.allCellsIndex = null;
        }
        //---------------------------------------------------------------------
        // EXPORTS
        //---------------------------------------------------------------------
        root['HSHG'] = HSHG;
        HSHG._private = {
            Grid: Grid,
            Cell: Cell,
            testAABBOverlap: testAABBOverlap,
            getLongestAABBEdge: getLongestAABBEdge
        };
    })(this);
}
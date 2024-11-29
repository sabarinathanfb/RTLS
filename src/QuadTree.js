export class QuadTree {
    constructor(bounds, maxPoints = 4) {
        this.bounds = bounds; // { x: { min, max }, z: { min, max } }
        this.maxPoints = maxPoints; // Maximum points per quadrant
        this.points = new Map(); // Use Map instead of an array to store points
        this.subdivided = false;
        this.northEast = null;
        this.northWest = null;
        this.southEast = null;
        this.southWest = null;
    }

    subdivide() {
        const { x, z } = this.bounds;
        const midX = (x.min + x.max) / 2;
        const midZ = (z.min + z.max) / 2;

        this.northEast = new QuadTree({
            x: { min: midX, max: x.max },
            z: { min: midZ, max: z.max }
        });
        this.northWest = new QuadTree({
            x: { min: x.min, max: midX },
            z: { min: midZ, max: z.max }
        });
        this.southEast = new QuadTree({
            x: { min: midX, max: x.max },
            z: { min: z.min, max: midZ }
        });
        this.southWest = new QuadTree({
            x: { min: x.min, max: midX },
            z: { min: z.min, max: midZ }
        });

        this.subdivided = true;
    }

    _pointKey(point) {
        // Create a unique key for the point using its x and z coordinates
        return `${point.x},${point.z}`;
    }

    insert(point) {
        // Check if the point is within the bounds
        if (point.x < this.bounds.x.min || point.x > this.bounds.x.max ||
            point.z < this.bounds.z.min || point.z > this.bounds.z.max) {
            return null; // Point out of bounds
        }

        // Check if the point already exists in the Map
        const key = `${point.x},${point.z}`;
        if (this.points.has(key)) {
            const existingPoint = this.points.get(key);
            existingPoint.frequency++; // Increase frequency for existing point
            return existingPoint; // Return existing point
        }

        // If this quadrant is not subdivided and has space, add the point
        if (this.points.size < this.maxPoints) {
            point.frequency = 1; // Initialize frequency for new point
            this.points.set(key, point); // Use Map to store the point
            return null; // New point added
        }

        // Subdivide and try to insert into the correct quadrant
        if (!this.subdivided) {
            this.subdivide();
        }

        // Attempt to insert in sub-quadrants
        return this.northEast.insert(point) || 
               this.northWest.insert(point) || 
               this.southEast.insert(point) || 
               this.southWest.insert(point);
    }

    retrieve(bounds) {
        const pointsInBounds = [];

        // If bounds do not intersect with the QuadTree bounds, return empty array
        if (!this.intersects(bounds)) {
            return pointsInBounds;
        }

        // Add points in the current node to the result
        for (const [key, point] of this.points.entries()) {
            pointsInBounds.push({ x: point.x, z: point.z, frequency: point.frequency });
        }

        // If this node is subdivided, recursively retrieve points from child nodes
        if (this.subdivided) {
            pointsInBounds.push(...this.northEast.retrieve(bounds));
            pointsInBounds.push(...this.northWest.retrieve(bounds));
            pointsInBounds.push(...this.southEast.retrieve(bounds));
            pointsInBounds.push(...this.southWest.retrieve(bounds));
        }

        return pointsInBounds;
    }

    intersects(bounds) {
        return !(bounds.x.min > this.bounds.x.max || 
                 bounds.x.max < this.bounds.x.min || 
                 bounds.z.min > this.bounds.z.max || 
                 bounds.z.max < this.bounds.z.min);
    }
}

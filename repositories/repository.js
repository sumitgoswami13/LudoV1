class Repository {
    constructor(model) {
        this.model = model;
    }

    async find(query = {}) {
        try {
            return await this.model.find(query);
        } catch (error) {
            throw new Error(`Error finding documents: ${error.message}`);
        }
    }

    async create(data) {
        try {
            const document = new this.model(data);
            return await document.save();
        } catch (error) {
            throw new Error(`Error creating document: ${error.message}`);
        }
    }

    async findById(id) {
        try {
            return await this.model.findById(id);
        } catch (error) {
            throw new Error(`Error finding document by ID: ${error.message}`);
        }
    }

    async delete(id) {
        try {
            return await this.model.findByIdAndDelete(id);
        } catch (error) {
            throw new Error(`Error deleting document: ${error.message}`);
        }
    }

    async update(id, data) {
        try {
            return await this.model.findByIdAndUpdate(id, data, { new: true });
        } catch (error) {
            throw new Error(`Error updating document: ${error.message}`);
        }
    }
}

module.exports = Repository;

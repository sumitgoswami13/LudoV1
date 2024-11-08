const mongoose = require('mongoose');

class Database {
    constructor(uri) {
        this.uri = uri;
    }
    async connect() {
        try {
            await mongoose.connect(this.uri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
        } catch (error) {
            throw error
        }
    }
}

module.exports = Database;

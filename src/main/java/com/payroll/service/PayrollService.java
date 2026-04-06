package com.payroll.service;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.payroll.config.MongoDBConnection;
import com.payroll.model.Employee;
import org.bson.Document;

public class PayrollService {

    private MongoCollection<Document> collection;

    public PayrollService() {
        MongoDatabase db = MongoDBConnection.getDatabase();
        collection = db.getCollection("employees");
    }

    public void saveEmployee(Employee emp) {
        Document doc = new Document("empId", emp.empId)
                .append("name", emp.name)
                .append("basic", emp.basic)
                .append("hra", emp.hra)
                .append("da", emp.da)
                .append("gross", emp.gross)
                .append("pf", emp.pf)
                .append("tax", emp.tax)
                .append("net", emp.net);

        collection.insertOne(doc);
    }

    public Document getEmployee(int empId) {
        return collection.find(new Document("empId", empId)).first();
    }
}
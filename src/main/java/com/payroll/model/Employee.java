package com.payroll.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "employees")
public class Employee {

    @Id
    public String id;

    public int empId;
    public String name;
    public double basic, hra, da, pf, tax;
    public double gross, net;

    public void calculate() {
        gross = basic + hra + da;
        net = gross - (pf + tax);
    }
}
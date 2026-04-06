package com.payroll.model;

public class Employee {

    public int empId;
    public String name;
    public double basic, hra, da, pf, tax;
    public double gross, net;

    public void calculateSalary() {
        gross = basic + hra + da;
        net = gross - (pf + tax);
    }
}
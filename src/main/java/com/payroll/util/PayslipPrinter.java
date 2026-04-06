package com.payroll.util;

import org.bson.Document;

public class PayslipPrinter {

    public static void print(Document d) {

        System.out.println("\n----- PAYSLIP -----");

        System.out.println("Employee ID   : " + d.getInteger("empId"));
        System.out.println("Employee Name : " + d.getString("name"));
        System.out.println("Basic Salary  : " + d.getDouble("basic"));
        System.out.println("HRA           : " + d.getDouble("hra"));
        System.out.println("DA            : " + d.getDouble("da"));
        System.out.println("Gross Salary  : " + d.getDouble("gross"));
        System.out.println("PF Deduction  : " + d.getDouble("pf"));
        System.out.println("Tax Deduction : " + d.getDouble("tax"));
        System.out.println("Net Salary    : " + d.getDouble("net"));

        System.out.println("--------------------");
    }
}
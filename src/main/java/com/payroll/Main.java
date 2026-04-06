package com.payroll;

import com.payroll.model.Employee;
import com.payroll.service.PayrollService;
import com.payroll.util.PayslipPrinter;
import org.bson.Document;

import java.util.Scanner;

public class Main {
    public static void main(String[] args) {

        Scanner sc = new Scanner(System.in);
        Employee emp = new Employee();

        System.out.print("Enter Employee ID: ");
        emp.empId = sc.nextInt();

        sc.nextLine();
        System.out.print("Enter Name: ");
        emp.name = sc.nextLine();

        System.out.print("Basic Salary: ");
        emp.basic = sc.nextDouble();

        System.out.print("HRA: ");
        emp.hra = sc.nextDouble();

        System.out.print("DA: ");
        emp.da = sc.nextDouble();

        System.out.print("PF: ");
        emp.pf = sc.nextDouble();

        System.out.print("Tax: ");
        emp.tax = sc.nextDouble();

        emp.calculateSalary();

        PayrollService service = new PayrollService();
        service.saveEmployee(emp);

        Document doc = service.getEmployee(emp.empId);
        PayslipPrinter.print(doc);
    }
}
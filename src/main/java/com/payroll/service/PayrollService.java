package com.payroll.service;

import com.payroll.model.Employee;
import com.payroll.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class PayrollService {

    @Autowired
    private EmployeeRepository repo;

    public Employee save(Employee emp) {
        emp.calculate();
        return repo.save(emp);
    }
}
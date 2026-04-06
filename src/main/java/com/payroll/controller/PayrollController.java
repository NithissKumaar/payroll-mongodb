package com.payroll.controller;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/payroll")
public class PayrollController {

    @GetMapping("/test")
    public String test() {
        return "Payroll API is running 🚀";
    }
}
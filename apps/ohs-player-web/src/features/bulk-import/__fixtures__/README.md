# Bulk import test fixtures

Workbooks generated with openpyxl 3.1.5. The first sheet holds the rows below; the second sheet of
`valid-organizations.xlsx` (`Notes`) proves only the first sheet is read.

| File                       | First sheet                                                                                                                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `valid-organizations.xlsx` | Organisation template header; `Ministry of Health` (phone as the number 254200000000, `is_team` FALSE) and `Nairobi Health Team` (`is_team` TRUE, `source_parent_id` MOH); an empty cell three rows below |
| `wrong-header.xlsx`        | Same rows, header `Name` instead of `name`                                                                                                                                                                |
| `comma-cell.xlsx`          | One organisation whose `physical_address` is `Afya House, Nairobi`                                                                                                                                        |
| `users-dob.xlsx`           | Users template header; `jdoe` with `dob` a date cell (1990-04-12), `national_id` the number 12345678, `is_password_temp` TRUE                                                                             |
| `not-a-spreadsheet.txt`    | Plain text                                                                                                                                                                                                |

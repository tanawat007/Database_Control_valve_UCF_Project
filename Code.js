// Code.gs
// ⚠️ สำคัญมาก: ใส่ Google Sheet ID (ไม่ใช่ Deployment ID)
// หา Sheet ID ได้จาก URL ของ Google Sheet:
// https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
 
const SHEET_ID = "1NbjfiPOXD_8Fv4Q6DvGd63Ny9AAUr35jMSB8a1XksoY"; // ⚠️ แทนที่ด้วย ID ของ Google Sheet
 
const SHEET_NAME = "Sheet1"; // ⚠️ ชื่อชีตที่ใช้เก็บข้อมูล
 
// ⚠️ สำคัญ: ตรวจสอบว่า Google Sheet มี Header columns ดังนี้:
// A:ID | B:MaterialCode | C:Description | D:ImageBefore | E:KeepingArea | F:Quantity | G:Lifttime | H:DateOfUse | I:ExpiredDate | J:MSDS | K:Timestamp
 
const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
 
function doGet(e) {
  // ตรวจสอบว่ามี e และ parameter หรือไม่
  if (!e || !e.parameter) {
    return getData(); // ถ้าไม่มี parameter ให้ดึงข้อมูลทั้งหมด
  }
  
  const params = e.parameter;
  const action = params.action;
  
  // ถ้าไม่มี action หรือ action = 'read' แสดงว่าเป็นการดึงข้อมูล
  if (!action || action === 'read') {
    return getData();
  }
  
  // จัดการตาม action ที่ได้รับ (สำหรับ delete ยังคงใช้ GET)
  switch(action) {
    case 'delete':
      return deleteRecord(params);
    default:
      return returnJSON({
        success: false,
        message: 'Invalid action: ' + action + '. Use POST for create/update.'
      });
  }
}
 
 
// รองรับ POST สำหรับ create/update (เพื่อรองรับ payload ขนาดใหญ่ เช่น base64 image)
function doPost(e) {
  try {
    var params;
    
    // รับข้อมูลจาก POST body (JSON)
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      params = e.parameter;
    } else {
      return returnJSON({ success: false, message: 'No data received' });
    }
    
    var action = params.action;
    
    switch(action) {
      case 'create':
        return createRecord(params);
      case 'update':
        return updateRecord(params);
      default:
        return returnJSON({
          success: false,
          message: 'Invalid POST action: ' + action
        });
    }
  } catch (error) {
    return returnJSON({
      success: false,
      message: 'Error in doPost: ' + error.toString()
    });
  }
}
 
// ฟังก์ชันดึงข้อมูลทั้งหมด
function getData() {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    // ถ้าไม่มีข้อมูล หรือมีแค่ header
    if (data.length <= 1) {
      return returnJSON({ success: true, data: [] });
    }
    
    const headers = data[0]; // แถวแรกคือ headers
    const rows = data.slice(1); // แถวที่เหลือคือข้อมูล
    
    // แปลงข้อมูลเป็น JSON format
    const result = rows.map(function(row) {
      var obj = {};
      headers.forEach(function(header, index) {
        obj[header] = row[index];
      });
      return obj;
    }).filter(function(row) {
      return row.ID; // กรองเฉพาะแถวที่มี ID
    });
    
    return returnJSON({ success: true, data: result });
  } catch (error) {
    return returnJSON({
      success: false,
      message: 'Error in getData: ' + error.toString()
    });
  }
}
 
// ฟังก์ชันสร้างข้อมูลใหม่
function createRecord(params) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const timestamp = Utilities.formatDate(
      new Date(),
      'Asia/Bangkok',
      'dd/MM/yyyy HH:mm:ss'
    );
    const id = Utilities.getUuid(); // สร้าง UUID จาก Google Apps Script
    
    // เพิ่มข้อมูลในแถวใหม่
    // Column order: ID | MaterialCode | Description | ImageBefore | KeepingArea | Quantity | Lifttime | DateOfUse | ExpiredDate | MSDS | Timestamp
    sheet.appendRow([
      id,
      params.materialCode || '',
      params.description || '',
      params.imageBefore || '',
      params.keepingArea || '',
      params.quantity || '',
      params.lifttime || '',
      params.leakage || '',
      params.failaction || '',
      params.dateOfUse || '',
      params.expiredDate || '',
      params.msds || '',
      timestamp
    ]);
    
    // Flush เพื่อให้แน่ใจว่าข้อมูลถูกบันทึก
    SpreadsheetApp.flush();
    
    Logger.log('Created record: ' + id);
    
    return returnJSON({
      success: true,
      message: 'สร้างข้อมูลสำเร็จ',
      id: id
    });
  } catch (error) {
    return returnJSON({
      success: false,
      message: 'Error in createRecord: ' + error.toString()
    });
  }
}
 
// ฟังก์ชันแก้ไขข้อมูล
function updateRecord(params) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    // หา ID ที่ต้องการแก้ไข
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == params.id) {
        const timestamp = Utilities.formatDate(
          new Date(),
          'Asia/Bangkok',
          'dd/MM/yyyy HH:mm:ss'
        );
        
        // อัพเดทข้อมูลในแถวที่พบ
        // Column order: ID | MaterialCode | Description | ImageBefore | KeepingArea | Quantity | Lifttime | DateOfUse | ExpiredDate | MSDS | Timestamp
        sheet.getRange(i + 1, 2).setValue(params.materialCode || '');   // B: MaterialCode
        sheet.getRange(i + 1, 3).setValue(params.description || '');    // C: Description
        sheet.getRange(i + 1, 4).setValue(params.imageBefore || '');    // D: ImageBefore
        sheet.getRange(i + 1, 5).setValue(params.keepingArea || '');    // E: KeepingArea
        sheet.getRange(i + 1, 6).setValue(params.quantity || '');       // F: Quantity
        sheet.getRange(i + 1, 7).setValue(params.lifttime || '');       // G: Lifttime
        sheet.getRange(i + 1, 8).setValue(params.leakage || '');       // Add: LeakageClass
        sheet.getRange(i + 1, 9).setValue(params.failaction || '');       // Add: FailAction
        sheet.getRange(i + 1, 10).setValue(params.dateOfUse || '');      // H: DateOfUse
        sheet.getRange(i + 1, 11).setValue(params.expiredDate || '');    // I: ExpiredDate
        sheet.getRange(i + 1, 12).setValue(params.msds || '');          // J: MSDS
        sheet.getRange(i + 1, 13).setValue(timestamp);                  // K: Timestamp
        
        SpreadsheetApp.flush();
        
        Logger.log('Updated record: ' + params.id);
        
        return returnJSON({
          success: true,
          message: 'อัปเดตข้อมูลสำเร็จ'
        });
      }
    }
    
    return returnJSON({
      success: false,
      message: 'ไม่พบข้อมูล ID: ' + params.id
    });
  } catch (error) {
    return returnJSON({
      success: false,
      message: 'Error in updateRecord: ' + error.toString()
    });
  }
}
 
// ฟังก์ชันลบข้อมูล
function deleteRecord(params) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    // หา ID ที่ต้องการลบ
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == params.id) {
        sheet.deleteRow(i + 1);
        SpreadsheetApp.flush();
        
        Logger.log('Deleted record: ' + params.id);
        
        return returnJSON({
          success: true,
          message: 'ลบข้อมูลสำเร็จ'
        });
      }
    }
    
    return returnJSON({
      success: false,
      message: 'ไม่พบข้อมูล ID: ' + params.id
    });
  } catch (error) {
    return returnJSON({
      success: false,
      message: 'Error in deleteRecord: ' + error.toString()
    });
  }
}
 
// ฟังก์ชันสำหรับ return JSON
function returnJSON(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
 